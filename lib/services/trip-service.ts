import { randomUUID } from "crypto"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import { defaultTripResult, quizResultMap, tripCatalog } from "@/lib/mocks/trips"
import { CREDITS_PER_GENERATED_TRIP } from "@/lib/services/credit-service"
import { getCurrentUser } from "@/lib/services/user-service"
import { getOpenAIServerClient } from "@/lib/openai/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { AppSession } from "@/types/session"
import type { QuizAnswer, TripGenerationInput, TripGenerationResponse, TripOrigin, TripResult } from "@/types/trip"

const aiTripSchema = z.object({
  destination: z.string().min(2),
  estimatedCost: z.string().min(2),
  summary: z.string().min(20),
  bestFor: z.string().min(3),
  itinerarySummary: z.array(z.string().min(3)).min(3).max(6),
  itineraryFull: z.array(z.string().min(10)).min(3).max(8),
  tips: z.array(z.string().min(5)).min(3).max(6),
})

const MIN_TRIP_COST = 300
const MAX_TRIP_COST = 50000
const MONTH_LABELS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const

function formatTripCost(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.max(MIN_TRIP_COST, Math.min(MAX_TRIP_COST, Math.round(value))))
}

function extractCostNumber(rawCost: string) {
  const normalized = rawCost.replace(/[^\d,.\s]/g, "").trim()

  if (!normalized) {
    return null
  }

  const hasComma = normalized.includes(",")
  const hasDot = normalized.includes(".")

  let numericText = normalized

  if (hasComma && hasDot) {
    numericText = normalized.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    numericText = normalized.replace(/\./g, "").replace(",", ".")
  } else {
    numericText = normalized.replace(/,/g, "")
  }

  const parsedFloat = Number.parseFloat(numericText)

  if (!Number.isFinite(parsedFloat) || parsedFloat <= 0) {
    return null
  }

  return Math.round(parsedFloat)
}

function resolveDurationDays(request: TripGenerationInput) {
  if (request.quizAnswers) {
    switch (request.quizAnswers.duration) {
      case "fim-de-semana":
        return 3
      case "4-6-dias":
        return 5
      case "7-10-dias":
        return 8
      case "11+-dias":
        return 12
    }
  }

  const normalizedInput = request.inputText?.toLowerCase() ?? ""

  if (normalizedInput.includes("fim de semana")) return 3
  if (normalizedInput.includes("4 dias") || normalizedInput.includes("5 dias") || normalizedInput.includes("6 dias")) return 5
  if (normalizedInput.includes("7 dias") || normalizedInput.includes("8 dias") || normalizedInput.includes("9 dias") || normalizedInput.includes("10 dias")) return 8
  if (normalizedInput.includes("11 dias") || normalizedInput.includes("12 dias") || normalizedInput.includes("duas semanas")) return 12

  return 5
}

function resolveDurationLabel(request: TripGenerationInput) {
  if (request.quizAnswers) {
    switch (request.quizAnswers.duration) {
      case "fim-de-semana":
        return "3 dias"
      case "4-6-dias":
        return "5 dias"
      case "7-10-dias":
        return "8 dias"
      case "11+-dias":
        return "12 dias"
    }
  }

  const normalizedInput = request.inputText?.toLowerCase() ?? ""
  const explicitDayMatch = normalizedInput.match(/(\d{1,2})\s*dias?/)

  if (explicitDayMatch) {
    return `${explicitDayMatch[1]} dias`
  }

  if (normalizedInput.includes("fim de semana")) return "3 dias"
  if (normalizedInput.includes("duas semanas")) return "14 dias"

  return `${resolveDurationDays(request)} dias`
}

function resolvePeriodLabel(request: TripGenerationInput) {
  const normalizedInput = request.inputText?.toLowerCase() ?? ""
  const dateRangeMatch = normalizedInput.match(
    /(\d{1,2})\s*(?:a|-|até)\s*(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
  )

  if (dateRangeMatch) {
    return `${dateRangeMatch[1]} a ${dateRangeMatch[2]} de ${dateRangeMatch[3].toLowerCase()}`
  }

  const monthMatch = MONTH_LABELS.find((month) => normalizedInput.includes(month))

  if (monthMatch) {
    return monthMatch.charAt(0).toUpperCase() + monthMatch.slice(1)
  }

  return undefined
}

function resolveTravelTier(request: TripGenerationInput, bestFor: string) {
  const budget = request.quizAnswers?.budget

  if (budget === "ate-3000") return "economico" as const
  if (budget === "ate-5000" || budget === "ate-8000") return "medio" as const
  if (budget === "acima-8000") return "premium" as const

  const text = `${request.inputText ?? ""} ${bestFor}`.toLowerCase()

  if (text.includes("luxo") || text.includes("premium") || text.includes("resort")) return "premium" as const
  if (text.includes("econom") || text.includes("barato") || text.includes("baixo custo")) return "economico" as const

  return "medio" as const
}

function buildRealisticCost(request: TripGenerationInput, bestFor: string) {
  const days = resolveDurationDays(request)
  const tier = resolveTravelTier(request, bestFor)

  const dailyCostByTier = {
    economico: 420,
    medio: 900,
    premium: 1850,
  }

  const baseByTier = {
    economico: 300,
    medio: 900,
    premium: 2200,
  }

  const longTripAdjustment = days >= 8 ? 0.92 : 1
  const rawCost = (baseByTier[tier] + dailyCostByTier[tier] * days) * longTripAdjustment

  return Math.max(MIN_TRIP_COST, Math.min(MAX_TRIP_COST, Math.round(rawCost / 50) * 50))
}

function normalizeEstimatedCost(rawCost: string, request: TripGenerationInput, bestFor: string) {
  const parsed = extractCostNumber(rawCost)
  const finalCost =
    parsed && parsed >= MIN_TRIP_COST && parsed <= MAX_TRIP_COST ? parsed : buildRealisticCost(request, bestFor)

  console.log("COST RAW:", rawCost)
  console.log("COST PARSED:", parsed)
  console.log("COST FINAL:", finalCost)

  return formatTripCost(finalCost)
}

function buildFallbackTripResult(origin: TripOrigin): TripResult {
  return {
    ...defaultTripResult,
    context:
      origin === "quiz"
        ? "Fallback mockado do quiz enquanto a integração com IA ainda não existe."
        : "Fallback mockado da busca enquanto a integração com IA ainda não existe.",
  }
}

function normalizeTripResult(result: TripResult, request?: TripGenerationInput): TripResult {
  const normalizedCost = request
    ? normalizeEstimatedCost(result.estimatedCost, request, result.bestFor)
    : result.estimatedCost
  const periodLabel = request ? resolvePeriodLabel(request) : result.periodLabel
  const durationLabel = request ? resolveDurationLabel(request) : result.durationLabel

  return {
    ...result,
    estimatedCost: normalizedCost,
    periodLabel,
    durationLabel,
    fullItinerary: result.fullItinerary ?? result.itinerary,
  }
}

function buildInputLabel(request: TripGenerationInput) {
  if (request.origin === "quiz" && request.quizAnswers) {
    return `Quiz: ${request.quizAnswers.tripStyle}, ${request.quizAnswers.budget}, ${request.quizAnswers.duration}, ${request.quizAnswers.region}, ${request.quizAnswers.vibe}`
  }

  return request.inputText?.trim() || "Busca VUEI"
}

function buildSearchSource(request: TripGenerationInput, isAuthenticated: boolean) {
  if (request.origin === "quiz") {
    return "quiz" as const
  }

  return isAuthenticated ? ("dashboard" as const) : ("landing" as const)
}

function buildUserPrompt(request: TripGenerationInput) {
  if (request.origin === "quiz" && request.quizAnswers) {
    return [
      `Origem: ${request.origin}`,
      "Respostas do quiz:",
      `- estilo: ${request.quizAnswers.tripStyle}`,
      `- orçamento: ${request.quizAnswers.budget}`,
      `- duração: ${request.quizAnswers.duration}`,
      `- região: ${request.quizAnswers.region}`,
      `- vibe: ${request.quizAnswers.vibe}`,
    ].join("\n")
  }

  return [`Origem: ${request.origin}`, `Solicitação do usuário: ${request.inputText?.trim() || "Busca VUEI"}`].join(
    "\n",
  )
}

function mapStructuredOutputToTripResult(output: z.infer<typeof aiTripSchema>, request: TripGenerationInput): TripResult {
  return normalizeTripResult(
    {
      destination: output.destination.trim(),
      estimatedCost: output.estimatedCost.trim(),
      summary: output.summary.trim(),
      bestFor: output.bestFor.trim(),
      itinerary: output.itinerarySummary.map((item) => item.trim()),
      fullItinerary: output.itineraryFull.map((item) => item.trim()),
      tips: output.tips.map((item) => item.trim()),
      context: `Ideal para ${output.bestFor.trim()}. Os custos são estimativas para apoio à decisão inicial.`,
    },
    request,
  )
}

function resolveAIError(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : null
  const message =
    typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : "Unknown AI error"

  if (status === 429 || message.toLowerCase().includes("quota")) {
    return {
      status: 429,
      message: "Não foi possível gerar sua viagem agora. Verifique a cota da OpenAI ou tente novamente mais tarde.",
    }
  }

  if (message.includes("OPENAI_API_KEY")) {
    return {
      status: 503,
      message: "Não foi possível gerar sua viagem agora. Revise a configuração da OpenAI no servidor.",
    }
  }

  return {
    status: 503,
    message: "Não foi possível gerar sua viagem agora. Tente novamente em instantes.",
  }
}

export function generateTrip(request: TripGenerationInput): TripGenerationResponse {
  try {
    if (request.origin === "quiz" && request.quizAnswers) {
      return {
        success: true,
        fallbackUsed: false,
        request,
        result: normalizeTripResult(generateTripFromQuiz(request.quizAnswers), request),
      }
    }

    return {
      success: true,
      fallbackUsed: false,
      request,
      result: normalizeTripResult(generateTripFromInput(request.inputText ?? ""), request),
    }
  } catch {
    return {
      success: false,
      fallbackUsed: true,
      request,
      result: buildFallbackTripResult(request.origin),
    }
  }
}

export async function generateTripWithAI(request: TripGenerationInput) {
  const client = getOpenAIServerClient()

  console.time("openai-call")

  try {
    const response = await client.responses.parse({
      model: "gpt-4.1-mini",
      max_output_tokens: 700,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Responda em português do Brasil, com acentuação correta, e devolva apenas JSON estruturado. Sugira um destino coerente, custo estimado em reais, resumo curto, roteiro resumido, roteiro completo e dicas úteis. Não invente preço real de passagem ou hotel.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildUserPrompt(request),
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(aiTripSchema, "trip_result"),
    },
  })

    if (response.output_parsed) {
      return mapStructuredOutputToTripResult(response.output_parsed, request)
    }

    throw new Error("OpenAI returned no structured output")
  } finally {
    console.timeEnd("openai-call")
  }
}

export async function generateAndPersistTrip({
  session,
  request,
}: {
  session: AppSession
  request: TripGenerationInput
}) {
  if (!session.isAuthenticated || !session.userId) {
    return {
      ok: false as const,
      status: 401,
      error: "AUTH_REQUIRED",
      message: "Faça login para gerar e salvar viagens no seu histórico.",
    }
  }

  const user = await getCurrentUser(session)

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "PROFILE_NOT_FOUND",
      message: "Não foi possível carregar seu perfil.",
    }
  }

  if (user.credits <= 0) {
    return {
      ok: false as const,
      status: 402,
      error: "NO_CREDITS",
      message: "Você não tem créditos disponíveis. Compre mais créditos para gerar uma nova viagem.",
    }
  }

  let result: TripResult

  try {
    result = await generateTripWithAI({
      ...request,
      userId: session.userId,
    })
  } catch (error) {
    console.error("OpenAI trip generation failed", error)
    const resolvedError = resolveAIError(error)
    return {
      ok: false as const,
      status: resolvedError.status,
      error: "AI_UNAVAILABLE",
      message: resolvedError.message,
    }
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>

  try {
    supabase = createSupabaseAdminClient()
  } catch (error) {
    console.error("Supabase admin client is not available for trip persistence", error)
    return {
      ok: false as const,
      status: 503,
      error: "SUPABASE_NOT_CONFIGURED",
      message: "Não foi possível salvar sua viagem agora. Revise a configuração do Supabase no servidor.",
    }
  }

  try {
    const now = new Date().toISOString()
    const searchId = randomUUID()
    const inputOriginal = buildInputLabel(request)
    const transactionDescription = `Consumo de crédito da viagem ${searchId}`

    console.time("save-trip")
    try {
      const { error: searchInsertError } = await supabase.from("searches").insert({
        id: searchId,
        user_id: user.id,
        email: user.email,
        source: buildSearchSource(request, true),
        prompt: inputOriginal,
        result,
        credits_used: CREDITS_PER_GENERATED_TRIP,
        created_at: now,
      })

      if (searchInsertError) {
        console.error("SAVE GENERATED TRIP ERROR:", {
          message: searchInsertError?.message,
          code: searchInsertError?.code,
          details: searchInsertError?.details,
          hint: searchInsertError?.hint,
        })
        return {
          ok: false as const,
          status: 500,
          error: "TRIP_SAVE_FAILED",
          message: "Não foi possível salvar sua viagem. Tente novamente.",
        }
      }
    } finally {
      console.timeEnd("save-trip")
    }

    const { data: existingUsage, error: usageQueryError } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "usage")
      .eq("description", transactionDescription)
      .maybeSingle()

    if (usageQueryError) {
      console.error("CREDIT TRANSACTION LOOKUP ERROR", {
        message: usageQueryError.message,
        code: usageQueryError.code,
        details: usageQueryError.details,
        hint: usageQueryError.hint,
      })
    }

    const shouldConsumeCredit = !existingUsage
    const newCreditsBalance = shouldConsumeCredit ? user.credits - CREDITS_PER_GENERATED_TRIP : user.credits

    if (shouldConsumeCredit) {
      console.log("PROFILE CREDITS RESULT", {
        userId: user.id,
        currentCredits: user.credits,
        newCreditsBalance,
      })

      console.time("credit-update")
      try {
        const { data: updatedProfile, error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            credits: newCreditsBalance,
          })
          .eq("id", user.id)
          .select("id,credits")
          .maybeSingle()

        if (profileUpdateError || !updatedProfile) {
          console.error("CREDIT RESERVE ERROR", {
            message: profileUpdateError?.message,
            code: profileUpdateError?.code,
            details: profileUpdateError?.details,
            hint: profileUpdateError?.hint,
            updatedProfile,
          })

          await supabase.from("searches").delete().eq("id", searchId)

          return {
            ok: false as const,
            status: 409,
            error: "CREDIT_CONFLICT",
            message: "Não foi possível reservar seu crédito agora. Tente novamente.",
          }
        }

        const { error: transactionError } = await supabase.from("credit_transactions").insert({
          id: randomUUID(),
          user_id: user.id,
          email: user.email,
          type: "usage",
          credits: -CREDITS_PER_GENERATED_TRIP,
          description: transactionDescription,
          payment_id: null,
          created_at: now,
        })

        if (transactionError) {
          console.error("CREDIT TRANSACTION ERROR", {
            message: transactionError.message,
            code: transactionError.code,
            details: transactionError.details,
            hint: transactionError.hint,
          })
        }
      } finally {
        console.timeEnd("credit-update")
      }
    }

    return {
      ok: true as const,
      status: 200,
      tripId: searchId,
      remainingCredits: newCreditsBalance,
      result,
      inputOriginal,
    }
  } catch (error) {
    console.error("Unexpected trip persistence failure", error)
    return {
      ok: false as const,
      status: 500,
      error: "TRIP_PERSISTENCE_FAILED",
      message: "Não foi possível salvar sua viagem. Tente novamente.",
    }
  }
}

export function generateTripFromInput(input: string): TripResult {
  const normalized = input.toLowerCase()
  const matched = tripCatalog.find((entry) => entry.match.some((keyword) => normalized.includes(keyword)))
  return normalizeTripResult(matched?.result ?? defaultTripResult)
}

export function generateTripFromQuiz(answers: QuizAnswer): TripResult {
  const base = quizResultMap[answers.vibe]

  if (answers.region === "brasil") {
    return normalizeTripResult(base)
  }

  if (answers.vibe === "praia") {
    return normalizeTripResult({
      ...base,
      destination: "Punta Cana",
      estimatedCost: answers.budget === "acima-8000" ? "R$ 8.600" : "R$ 6.900",
      bestFor: "praia, resort, descanso",
      context: "Boa para quem quer experiência simples de decidir e alta recompensa visual.",
      cheapestAlternative: "Cartagena",
    })
  }

  return normalizeTripResult({
    ...base,
    destination: "Portugal",
    estimatedCost: answers.budget === "ate-3000" ? "R$ 5.200" : base.estimatedCost,
    bestFor: "cultura, gastronomia, praticidade",
    cheapestAlternative: "Porto",
  })
}
