import { NextResponse } from "next/server"
import { z } from "zod"
import { recordAIGenerationLog } from "@/lib/services/ai-generation-log-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { didTripUseFallback, generateAndPersistTrip, generateTripWithAI, OPENAI_TRIP_MODEL } from "@/lib/services/trip-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { sanitizeTripProfileInput } from "@/lib/travel/trip-profile"

const quizAnswersSchema = z.object({
  tripStyle: z.enum(["solo", "romantica", "familia", "aventura", "descanso", "luxo", "cultural"]),
  budget: z.enum(["ate-3000", "ate-5000", "ate-8000", "acima-8000"]),
  duration: z.enum(["fim-de-semana", "4-6-dias", "7-10-dias", "11+-dias"]),
  region: z.enum(["brasil", "internacional"]),
  vibe: z.enum(["praia", "inverno", "verao", "cultura", "natureza", "luxo"]),
})

const tripProfileSchema = z.object({
  style: z.enum(["familia", "casal", "amigos", "solo", "trabalho", "luxo", "aventura", "relaxamento"]).optional().nullable(),
  pace: z.enum(["tranquilo", "equilibrado", "intenso"]).optional().nullable(),
  preferences: z
    .array(z.enum(["praia", "natureza", "cultura", "gastronomia", "vida-noturna", "neve-frio", "compras", "parques-atracoes"]))
    .optional()
    .nullable(),
  priceSensitivity: z.enum(["economico", "intermediario", "premium"]).optional().nullable(),
  flightPreference: z.enum(["voos-curtos", "aceito-conexoes", "evitar-conexoes", "nao-importa"]).optional().nullable(),
})

const generateTripPayloadSchema = z.object({
  origin: z.enum(["busca", "quiz", "sugestao"]).optional(),
  input: z.string().optional(),
  quizAnswers: quizAnswersSchema.optional(),
  profile: tripProfileSchema.optional().nullable(),
  travelers: z.number().int().positive().max(20).optional(),
})

function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

function jsonError(error: string, code: string, status: number, detail?: string) {
  return NextResponse.json({ ok: false, error, code, detail }, { status })
}

export async function POST(request: Request) {
  console.time("generate-trip-total")
  const startedAt = Date.now()
  const createdAt = new Date().toISOString()
  let json: unknown

  try {
    json = await request.json()
  } catch (error) {
    console.error("Invalid JSON payload for trip generation", error)
    return jsonError("Os dados enviados para gerar a viagem são inválidos.", "INVALID_JSON", 400, "Invalid JSON payload")
  }

  const parsedPayload = generateTripPayloadSchema.safeParse(json)

  if (!parsedPayload.success) {
    return jsonError("Os dados enviados para gerar a viagem são inválidos.", "INVALID_PAYLOAD", 400, parsedPayload.error.message)
  }

  const body = parsedPayload.data
  const origin = body.origin ?? "busca"
  const profile = sanitizeTripProfileInput(body.profile)
  const session = await getServerSession()
  const source = session?.isAuthenticated ? "authenticated" : "anonymous_landing"

  console.debug("Trip generation request received", {
    authenticated: !!session?.isAuthenticated,
    origin,
    hasInput: !!body.input?.trim(),
    hasQuizAnswers: !!body.quizAnswers,
  })

  try {
    if (!session?.isAuthenticated) {
      try {
        const result = await generateTripWithAI({
          origin,
          inputText: body.input?.trim() || "quero viajar para europa com 5 mil reais",
          quizAnswers: body.quizAnswers,
          profile,
          travelers: body.travelers,
        })

        let publicSearchId: string | undefined

        try {
          const supabase = createSupabaseAdminClient()
          const prompt =
            origin === "quiz"
              ? `Quiz: ${body.quizAnswers?.tripStyle ?? ""}, ${body.quizAnswers?.budget ?? ""}, ${body.quizAnswers?.duration ?? ""}, ${body.quizAnswers?.region ?? ""}, ${body.quizAnswers?.vibe ?? ""}`
              : body.input?.trim() || "Busca VUEI"

          const inserted = await supabase
            .from("searches")
            .insert({
              email: null,
              user_id: null,
              source: origin === "quiz" ? "quiz" : "landing",
              prompt,
              result,
              credits_used: 0,
            })
            .select("id")
            .maybeSingle()

          if (inserted.error) {
            console.error("PUBLIC SEARCH INSERT ERROR:", inserted.error)
          } else {
            publicSearchId = inserted.data?.id
          }
        } catch (error) {
          console.error("PUBLIC SEARCH INSERT ERROR:", error)
        }

        await recordAIGenerationLog({
          userId: null,
          source,
          generationType: "preview",
          success: true,
          usedFallback: didTripUseFallback(result),
          durationMs: Date.now() - startedAt,
          model: OPENAI_TRIP_MODEL,
          createdAt,
        })

        return jsonOk({
          persisted: !!publicSearchId,
          tripId: publicSearchId,
          result,
        })
      } catch (error) {
        console.error("OpenAI trip generation failed", error)
        const status =
          typeof error === "object" && error !== null && "status" in error && Number(error.status) === 429 ? 429 : 503
        const message =
          status === 429
            ? "Não foi possível gerar sua viagem agora. Verifique a cota da OpenAI ou tente novamente mais tarde."
            : "Não foi possível gerar sua viagem agora. Tente novamente em instantes."

        const detail =
          typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
            ? error.message
            : "OpenAI trip generation failed"

        await recordAIGenerationLog({
          userId: null,
          source,
          generationType: "preview",
          success: false,
          usedFallback: false,
          openaiError: detail,
          durationMs: Date.now() - startedAt,
          model: OPENAI_TRIP_MODEL,
          createdAt,
        })

        return jsonError(message, "AI_UNAVAILABLE", status, detail)
      }
    }

    const response = await generateAndPersistTrip({
      session,
      request: {
        origin,
        inputText: body.input?.trim(),
        quizAnswers: body.quizAnswers,
        profile,
        travelers: body.travelers,
        userId: session.userId ?? undefined,
      },
    })

    if (!response.ok) {
      await recordAIGenerationLog({
        userId: session.userId ?? null,
        source,
        generationType: "preview",
        success: false,
        usedFallback: false,
        openaiError: response.error,
        durationMs: Date.now() - startedAt,
        model: OPENAI_TRIP_MODEL,
        createdAt,
      })

      return jsonError(response.message, response.error, response.status, response.error)
    }

    await recordAIGenerationLog({
      userId: session.userId ?? null,
      source,
      generationType: "preview",
      success: true,
      usedFallback: didTripUseFallback(response.result),
      durationMs: Date.now() - startedAt,
      model: OPENAI_TRIP_MODEL,
      createdAt,
    })

    return jsonOk({
      persisted: !!response.tripId,
      tripId: response.tripId,
      remainingCredits: response.remainingCredits,
      result: response.result,
    })
  } finally {
    console.timeEnd("generate-trip-total")
  }
}
