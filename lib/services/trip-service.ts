import { randomUUID } from "crypto"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import { defaultTripResult, quizResultMap, tripCatalog } from "@/lib/mocks/trips"
import { getOpenAIServerClient } from "@/lib/openai/server"
import { CREDITS_PER_GENERATED_TRIP } from "@/lib/services/credit-service"
import { getCurrentUser } from "@/lib/services/user-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { buildTripIntelligence } from "@/lib/travel/travel-intelligence"
import type { AppSession } from "@/types/session"
import type {
  QuizAnswer,
  TripCostBreakdown,
  TripGenerationInput,
  TripGenerationResponse,
  TripOrigin,
  TripResult,
  TripVariant,
} from "@/types/trip"

const aiBreakdownSchema = z.object({
  flights: z.number().nonnegative(),
  lodging: z.number().nonnegative(),
  food: z.number().nonnegative(),
  localTransport: z.number().nonnegative(),
  activities: z.number().nonnegative(),
})

const aiVariantSchema = z.object({
  type: z.enum(["economic", "intermediate", "premium"]),
  title: z.string().min(2),
  totalCost: z.number().positive(),
  costPerPerson: z.number().positive(),
  breakdown: aiBreakdownSchema,
  assumptions: z.string().min(20),
  itinerary: z.array(z.string().min(10)).min(3).max(10),
})

const aiTripSchema = z.object({
  destination: z.string().min(2),
  periodLabel: z.string().min(2),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  durationDays: z.number().int().positive(),
  travelers: z.number().int().positive(),
  currency: z.literal("BRL"),
  summary: z.string().min(30),
  bestFor: z.string().min(3),
  tips: z.array(z.string().min(8)).min(3).max(6),
  variants: z.array(aiVariantSchema).length(3),
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

type TravelTier = "economico" | "medio" | "premium"
type CostVariantType = TripVariant["type"]
type PeriodData = {
  periodLabel: string
  startDate?: string
  endDate?: string
  durationDays: number
  durationLabel: string
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

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

function roundCurrency(value: number) {
  return Math.round(value / 50) * 50
}

function clampTripCost(value: number) {
  return Math.max(MIN_TRIP_COST, Math.min(MAX_TRIP_COST, roundCurrency(value)))
}

function extractDestinationFromInput(inputText?: string) {
  const normalizedInput = normalizeText(inputText)
  const lower = normalizedInput.toLowerCase()

  const paraMatch = lower.match(/(?:para|em)\s+([a-zà-ÿ\s-]{3,})/i)
  if (paraMatch?.[1]) {
    return paraMatch[1]
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\s+(com|minha|minhas|meu|meus|gastando|ate|até|por|durante)\b.*$/i, "")
  }

  return undefined
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function inferTravelers(request: TripGenerationInput, bestFor = "") {
  if (request.profile?.style === "solo") return 1
  if (request.profile?.style === "casal") return 2
  if (request.profile?.style === "familia") return 3
  if (request.profile?.style === "amigos") return 4

  if (request.quizAnswers?.tripStyle === "solo") return 1
  if (request.quizAnswers?.tripStyle === "romantica") return 2
  if (request.quizAnswers?.tripStyle === "familia") return 3

  const normalized = `${request.inputText ?? ""} ${bestFor}`.toLowerCase()

  const explicitTravelers = normalized.match(/(\d{1,2})\s+(?:pessoas|adultos|viajantes)/)
  if (explicitTravelers) {
    return Math.max(1, Number.parseInt(explicitTravelers[1], 10))
  }

  if (normalized.includes("casal") || normalized.includes("dupla")) return 2
  if (normalized.includes("família") || normalized.includes("familia")) return 3
  if (normalized.includes("sozinho") || normalized.includes("solo")) return 1

  return 2
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
  const explicitDayMatch = normalizedInput.match(/(\d{1,2})\s*dias?/)

  if (explicitDayMatch) {
    return Math.max(2, Number.parseInt(explicitDayMatch[1], 10))
  }

  if (normalizedInput.includes("fim de semana")) return 3
  if (normalizedInput.includes("duas semanas")) return 14

  return 5
}

function resolvePeriodData(request: TripGenerationInput): PeriodData {
  const durationDays = resolveDurationDays(request)
  const durationLabel = `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`

  if (request.quizAnswers) {
    return {
      periodLabel: "Período não informado",
      durationDays,
      durationLabel,
    }
  }

  const normalizedInput = request.inputText?.toLowerCase() ?? ""
  const dateRangeMatch = normalizedInput.match(
    /(\d{1,2})\s*(?:a|-|até)\s*(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
  )

  if (dateRangeMatch) {
    const startDay = dateRangeMatch[1].padStart(2, "0")
    const endDay = dateRangeMatch[2].padStart(2, "0")
    const month = dateRangeMatch[3].toLowerCase()
    return {
      periodLabel: `${dateRangeMatch[1]} a ${dateRangeMatch[2]} de ${month}`,
      startDate: `${startDay} de ${month}`,
      endDate: `${endDay} de ${month}`,
      durationDays,
      durationLabel,
    }
  }

  const dayMonthMatch = normalizedInput.match(
    /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
  )

  if (dayMonthMatch) {
    const month = dayMonthMatch[2].toLowerCase()
    const startDay = dayMonthMatch[1].padStart(2, "0")
    return {
      periodLabel: `${dayMonthMatch[1]} de ${month}`,
      startDate: `${startDay} de ${month}`,
      durationDays,
      durationLabel,
    }
  }

  const monthMatch = MONTH_LABELS.find((month) => normalizedInput.includes(month))
  if (monthMatch) {
    return {
      periodLabel: monthMatch.charAt(0).toUpperCase() + monthMatch.slice(1),
      durationDays,
      durationLabel,
    }
  }

  return {
    periodLabel: "Período não informado",
    durationDays,
    durationLabel,
  }
}

function resolveTravelTier(request: TripGenerationInput, bestFor: string) {
  const priceSensitivity = request.profile?.priceSensitivity
  const budget = request.quizAnswers?.budget

  if (priceSensitivity === "economico") return "economico" as const
  if (priceSensitivity === "premium") return "premium" as const
  if (priceSensitivity === "intermediario") return "medio" as const

  if (budget === "ate-3000") return "economico" as const
  if (budget === "ate-5000" || budget === "ate-8000") return "medio" as const
  if (budget === "acima-8000") return "premium" as const

  const text = `${request.inputText ?? ""} ${bestFor}`.toLowerCase()

  if (text.includes("luxo") || text.includes("premium") || text.includes("resort")) return "premium" as const
  if (text.includes("econom") || text.includes("barato") || text.includes("baixo custo")) return "economico" as const

  return "medio" as const
}

function isInternationalDestination(request: TripGenerationInput, destination: string) {
  if (request.quizAnswers?.region === "internacional") {
    return true
  }

  if (request.quizAnswers?.region === "brasil") {
    return false
  }

  const normalized = destination.toLowerCase()
  const internationalHints = [
    "portugal",
    "espanha",
    "itália",
    "italia",
    "frança",
    "franca",
    "paris",
    "barcelona",
    "roma",
    "madrid",
    "londres",
    "orlando",
    "miami",
    "nova york",
    "punta cana",
    "cartagena",
    "lisboa",
    "porto",
  ]

  return internationalHints.some((hint) => normalized.includes(hint))
}

function buildBaseVariantCost({
  request,
  destination,
  bestFor,
  travelers,
  durationDays,
  variantType,
}: {
  request: TripGenerationInput
  destination: string
  bestFor: string
  travelers: number
  durationDays: number
  variantType: CostVariantType
}) {
  const international = isInternationalDestination(request, destination)
  const destinationFactor = 0.9 + (hashString(destination.toLowerCase()) % 36) / 100
  const tripProfile = `${request.inputText ?? ""} ${bestFor}`.toLowerCase()
  const profileFactor =
    tripProfile.includes("luxo") || tripProfile.includes("resort")
      ? 1.18
      : tripProfile.includes("avent") || tripProfile.includes("natureza")
        ? 1.08
        : 1

  const tierFactor: Record<CostVariantType, number> = {
    economic: 0.82,
    intermediate: 1,
    premium: 1.34,
  }

  const fixedBase = international ? 1300 : 480
  const dailyPerTraveler = international ? 620 : 260
  const total = (fixedBase * travelers + dailyPerTraveler * travelers * durationDays) * destinationFactor * profileFactor * tierFactor[variantType]

  return clampTripCost(total)
}

function buildBreakdown({
  totalCost,
  variantType,
  request,
  destination,
  durationDays,
}: {
  totalCost: number
  variantType: CostVariantType
  request: TripGenerationInput
  destination: string
  durationDays: number
}) {
  const international = isInternationalDestination(request, destination)
  const profileText = `${request.inputText ?? ""} ${request.quizAnswers?.vibe ?? ""}`.toLowerCase()

  const baseRatios = international
    ? { flights: 0.34, lodging: 0.28, food: 0.14, localTransport: 0.09, activities: 0.15 }
    : { flights: 0.22, lodging: 0.34, food: 0.18, localTransport: 0.11, activities: 0.15 }

  if (variantType === "premium") {
    baseRatios.lodging += 0.04
    baseRatios.activities += 0.02
    baseRatios.food += 0.01
    baseRatios.flights -= 0.04
    baseRatios.localTransport -= 0.03
  }

  if (variantType === "economic") {
    baseRatios.flights += 0.02
    baseRatios.lodging -= 0.04
    baseRatios.activities -= 0.02
    baseRatios.localTransport += 0.01
    baseRatios.food += 0.03
  }

  if (profileText.includes("aventura") || profileText.includes("natureza")) {
    baseRatios.activities += 0.03
    baseRatios.food -= 0.01
    baseRatios.localTransport += 0.01
    baseRatios.lodging -= 0.03
  }

  if (durationDays >= 8) {
    baseRatios.lodging += 0.03
    baseRatios.food += 0.02
    baseRatios.flights -= 0.03
    baseRatios.activities -= 0.02
  }

  const rawBreakdown = {
    flights: clampTripCost(totalCost * baseRatios.flights),
    lodging: clampTripCost(totalCost * baseRatios.lodging),
    food: clampTripCost(totalCost * baseRatios.food),
    localTransport: clampTripCost(totalCost * baseRatios.localTransport),
    activities: clampTripCost(totalCost * baseRatios.activities),
  }

  const currentSum =
    rawBreakdown.flights +
    rawBreakdown.lodging +
    rawBreakdown.food +
    rawBreakdown.localTransport +
    rawBreakdown.activities
  rawBreakdown.lodging += totalCost - currentSum

  return rawBreakdown
}

function normalizeBreakdown({
  breakdown,
  totalCost,
  variantType,
  request,
  destination,
  durationDays,
}: {
  breakdown: Partial<TripCostBreakdown> | null | undefined
  totalCost: number
  variantType: CostVariantType
  request: TripGenerationInput
  destination: string
  durationDays: number
}) {
  const values = breakdown
    ? [breakdown.flights, breakdown.lodging, breakdown.food, breakdown.localTransport, breakdown.activities]
    : []
  const hasInvalidValue = values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0)

  if (!breakdown || hasInvalidValue) {
    return buildBreakdown({ totalCost, variantType, request, destination, durationDays })
  }

  const normalized: TripCostBreakdown = {
    flights: clampTripCost(breakdown.flights ?? 0),
    lodging: clampTripCost(breakdown.lodging ?? 0),
    food: clampTripCost(breakdown.food ?? 0),
    localTransport: clampTripCost(breakdown.localTransport ?? 0),
    activities: clampTripCost(breakdown.activities ?? 0),
  }

  const sum = normalized.flights + normalized.lodging + normalized.food + normalized.localTransport + normalized.activities

  if (Math.abs(sum - totalCost) > 600) {
    return buildBreakdown({ totalCost, variantType, request, destination, durationDays })
  }

  normalized.lodging += totalCost - sum
  return normalized
}

function compactItineraryLine(value: string, index: number) {
  const sentence = normalizeText(value).split(".")[0] || normalizeText(value)
  return sentence.startsWith("Dia") ? sentence : `Dia ${index + 1}: ${sentence}`
}

function normalizeItinerary(values: string[], destination: string, variantTitle: string) {
  if (values.length >= 3) {
    return values.map((value, index) => {
      const normalized = normalizeText(value)
      return normalized.startsWith("Dia") ? normalized : `Dia ${index + 1}: ${normalized}`
    })
  }

  return [
    `Dia 1: chegada em ${destination} com organização da hospedagem e primeiros deslocamentos no ritmo ${variantTitle.toLowerCase()}.`,
    `Dia 2: aproveite o principal passeio de ${destination}, com pausas adequadas e custos compatíveis com a proposta ${variantTitle.toLowerCase()}.`,
    `Dia 3: finalize a viagem com experiências complementares, gastronomia e retorno planejado.`,
  ]
}

function buildAssumptions({
  destination,
  variantTitle,
  travelers,
  durationDays,
  request,
}: {
  destination: string
  variantTitle: string
  travelers: number
  durationDays: number
  request: TripGenerationInput
}) {
  const international = isInternationalDestination(request, destination)
  const scope = international ? "trechos aéreos internacionais e hospedagem de padrão turístico" : "trechos nacionais e hospedagem de padrão turístico"

  return `Estimativa em BRL para ${travelers} ${travelers === 1 ? "pessoa" : "pessoas"} durante ${durationDays} ${
    durationDays === 1 ? "dia" : "dias"
  }, considerando ${scope}, alimentação diária, transporte local e passeios compatíveis com a opção ${variantTitle.toLowerCase()}.`
}

function normalizeVariant({
  variant,
  expectedType,
  request,
  destination,
  bestFor,
  travelers,
  durationDays,
}: {
  variant: z.infer<typeof aiVariantSchema> | undefined
  expectedType: CostVariantType
  request: TripGenerationInput
  destination: string
  bestFor: string
  travelers: number
  durationDays: number
}): TripVariant {
  const fallbackTotal = buildBaseVariantCost({
    request,
    destination,
    bestFor,
    travelers,
    durationDays,
    variantType: expectedType,
  })

  const aiTotal = typeof variant?.totalCost === "number" ? clampTripCost(variant.totalCost) : null
  const totalCost = aiTotal && aiTotal >= MIN_TRIP_COST && aiTotal <= MAX_TRIP_COST ? aiTotal : fallbackTotal
  const titleByType: Record<CostVariantType, string> = {
    economic: "Econômico",
    intermediate: "Intermediário",
    premium: "Premium",
  }

  const breakdown = normalizeBreakdown({
    breakdown: variant?.breakdown,
    totalCost,
    variantType: expectedType,
    request,
    destination,
    durationDays,
  })

  const costPerPerson = clampTripCost(totalCost / travelers)
  const assumptions =
    normalizeText(variant?.assumptions) ||
    buildAssumptions({ destination, variantTitle: titleByType[expectedType], travelers, durationDays, request })
  const itinerary = normalizeItinerary(variant?.itinerary ?? [], destination, titleByType[expectedType])

  return {
    type: expectedType,
    title: normalizeText(variant?.title) || titleByType[expectedType],
    totalCost,
    costPerPerson,
    breakdown,
    assumptions,
    itinerary,
  }
}

function ensureVariantOrdering({
  variants,
  request,
  destination,
  bestFor,
  travelers,
  durationDays,
}: {
  variants: TripVariant[]
  request: TripGenerationInput
  destination: string
  bestFor: string
  travelers: number
  durationDays: number
}) {
  const economic = variants.find((variant) => variant.type === "economic")
  const intermediate = variants.find((variant) => variant.type === "intermediate")
  const premium = variants.find((variant) => variant.type === "premium")

  const fallbackEconomic = buildBaseVariantCost({
    request,
    destination,
    bestFor,
    travelers,
    durationDays,
    variantType: "economic",
  })
  const fallbackIntermediate = buildBaseVariantCost({
    request,
    destination,
    bestFor,
    travelers,
    durationDays,
    variantType: "intermediate",
  })
  const fallbackPremium = buildBaseVariantCost({
    request,
    destination,
    bestFor,
    travelers,
    durationDays,
    variantType: "premium",
  })

  const minStep = Math.max(300, roundCurrency(durationDays * travelers * 80))

  const economicTotal = economic ? Math.min(economic.totalCost, fallbackIntermediate - minStep) : fallbackEconomic
  const intermediateSeed = intermediate?.totalCost ?? fallbackIntermediate
  const intermediateTotal = Math.max(intermediateSeed, economicTotal + minStep)
  const premiumSeed = premium?.totalCost ?? fallbackPremium
  const premiumTotal = Math.max(premiumSeed, intermediateTotal + minStep)

  return [
    {
      ...(economic ?? normalizeVariant({ variant: undefined, expectedType: "economic", request, destination, bestFor, travelers, durationDays })),
      totalCost: clampTripCost(economicTotal),
    },
    {
      ...(intermediate ??
        normalizeVariant({ variant: undefined, expectedType: "intermediate", request, destination, bestFor, travelers, durationDays })),
      totalCost: clampTripCost(intermediateTotal),
    },
    {
      ...(premium ?? normalizeVariant({ variant: undefined, expectedType: "premium", request, destination, bestFor, travelers, durationDays })),
      totalCost: clampTripCost(premiumTotal),
    },
  ].map((variant) => {
    const breakdown = normalizeBreakdown({
      breakdown: variant.breakdown,
      totalCost: variant.totalCost,
      variantType: variant.type,
      request,
      destination,
      durationDays,
    })

    return {
      ...variant,
      breakdown,
      costPerPerson: clampTripCost(variant.totalCost / travelers),
    }
  })
}

function normalizeEstimatedCost(rawCost: string, request: TripGenerationInput, bestFor: string) {
  const parsed = extractCostNumber(rawCost)
  const finalCost =
    parsed && parsed >= MIN_TRIP_COST && parsed <= MAX_TRIP_COST ? parsed : buildBaseVariantCost({
      request,
      destination: extractDestinationFromInput(request.inputText) ?? "Destino sugerido",
      bestFor,
      travelers: inferTravelers(request, bestFor),
      durationDays: resolveDurationDays(request),
      variantType: "intermediate",
    })

  console.log("COST RAW:", rawCost)
  console.log("COST PARSED:", parsed)
  console.log("COST FINAL:", finalCost)

  return formatTripCost(finalCost)
}

function buildFallbackTripResult(origin: TripOrigin): TripResult {
  return {
    ...defaultTripResult,
    periodLabel: "Período não informado",
    durationDays: 5,
    durationLabel: "5 dias",
    travelers: 2,
    currency: "BRL",
    context:
      origin === "quiz"
        ? "Fallback mockado do quiz enquanto a integração com IA ainda não existe."
        : "Fallback mockado da busca enquanto a integração com IA ainda não existe.",
  }
}

function normalizeTripResult(result: TripResult, request?: TripGenerationInput): TripResult {
  const bestFor = normalizeText(result.bestFor) || "viajantes em busca de praticidade"
  const normalizedCost = request ? normalizeEstimatedCost(result.estimatedCost, request, bestFor) : result.estimatedCost
  const periodData = request ? resolvePeriodData(request) : null
  const travelers = request ? inferTravelers(request, bestFor) : result.travelers ?? 2
  const intelligence = request ? buildTripIntelligence(result.destination, request).intelligence : result.intelligence

  return {
    ...result,
    bestFor,
    estimatedCost: normalizedCost,
    periodLabel: result.periodLabel ?? periodData?.periodLabel ?? "Período não informado",
    startDate: result.startDate ?? periodData?.startDate,
    endDate: result.endDate ?? periodData?.endDate,
    durationDays: result.durationDays ?? periodData?.durationDays,
    durationLabel: result.durationLabel ?? periodData?.durationLabel,
    travelers,
    currency: "BRL",
    fullItinerary: result.fullItinerary ?? result.itinerary,
    intelligence,
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
  const periodData = resolvePeriodData(request)
  const travelers = inferTravelers(request)
  const profileLines = request.profile
    ? [
        "Perfil complementar informado:",
        `- estilo complementar: ${request.profile.style ?? "nao informado"}`,
        `- ritmo: ${request.profile.pace ?? "nao informado"}`,
        `- preferências: ${request.profile.preferences?.join(", ") || "nao informadas"}`,
        `- sensibilidade a preço: ${request.profile.priceSensitivity ?? "nao informada"}`,
        `- voo: ${request.profile.flightPreference ?? "nao informado"}`,
      ]
    : []

  if (request.origin === "quiz" && request.quizAnswers) {
    return [
      `Origem: ${request.origin}`,
      "Respostas do quiz:",
      `- estilo: ${request.quizAnswers.tripStyle}`,
      `- orçamento: ${request.quizAnswers.budget}`,
      `- duração: ${request.quizAnswers.duration}`,
      `- região: ${request.quizAnswers.region}`,
      `- vibe: ${request.quizAnswers.vibe}`,
      `- viajantes estimados: ${travelers}`,
      `- período informado: ${periodData.periodLabel}`,
      `- duração esperada: ${periodData.durationDays} dias`,
    ].join("\n")
  }

  return [
    `Origem: ${request.origin}`,
    `Solicitação do usuário: ${request.inputText?.trim() || "Busca VUEI"}`,
    `Viajantes estimados: ${travelers}`,
    `Período informado: ${periodData.periodLabel}`,
    `Duração esperada: ${periodData.durationDays} dias`,
  ].join("\n")
}

function mapStructuredOutputToTripResult(output: z.infer<typeof aiTripSchema>, request: TripGenerationInput): TripResult {
  const fallbackDestination = extractDestinationFromInput(request.inputText) ?? generateTripFromInput(request.inputText ?? "").destination
  const destination = normalizeText(output.destination) || fallbackDestination
  const periodData = resolvePeriodData(request)
  const durationDays = output.durationDays > 0 ? output.durationDays : periodData.durationDays
  const travelers = output.travelers > 0 ? output.travelers : inferTravelers(request, output.bestFor)

  const normalizedVariants = ensureVariantOrdering({
    variants: [
      normalizeVariant({
        variant: output.variants.find((variant) => variant.type === "economic"),
        expectedType: "economic",
        request,
        destination,
        bestFor: output.bestFor,
        travelers,
        durationDays,
      }),
      normalizeVariant({
        variant: output.variants.find((variant) => variant.type === "intermediate"),
        expectedType: "intermediate",
        request,
        destination,
        bestFor: output.bestFor,
        travelers,
        durationDays,
      }),
      normalizeVariant({
        variant: output.variants.find((variant) => variant.type === "premium"),
        expectedType: "premium",
        request,
        destination,
        bestFor: output.bestFor,
        travelers,
        durationDays,
      }),
    ],
    request,
    destination,
    bestFor: output.bestFor,
    travelers,
    durationDays,
  })

  const selectedVariant = normalizedVariants.find((variant) => variant.type === "intermediate") ?? normalizedVariants[1]

  return normalizeTripResult(
    {
      destination,
      estimatedCost: formatTripCost(selectedVariant.totalCost),
      bestFor: normalizeText(output.bestFor) || "viajantes que buscam uma viagem bem planejada",
      summary:
        normalizeText(output.summary) ||
        `Sugestão de viagem para ${destination}, com custos estimados em BRL e variações por perfil, duração e quantidade de pessoas.`,
      periodLabel: normalizeText(output.periodLabel) || periodData.periodLabel,
      startDate: normalizeText(output.startDate ?? undefined) || periodData.startDate,
      endDate: normalizeText(output.endDate ?? undefined) || periodData.endDate,
      durationDays,
      durationLabel: `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`,
      travelers,
      currency: "BRL",
      variants: normalizedVariants,
      itinerary: selectedVariant.itinerary.map(compactItineraryLine),
      fullItinerary: selectedVariant.itinerary,
      tips: output.tips.map((tip) => normalizeText(tip)).filter(Boolean),
      context: normalizeText(selectedVariant.assumptions),
      cheapestAlternative: normalizedVariants[0]?.title ? `${destination} ${normalizedVariants[0].title}` : undefined,
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
  const destinationHint =
    extractDestinationFromInput(request.inputText) ??
    (request.origin === "quiz" && request.quizAnswers ? generateTripFromQuiz(request.quizAnswers).destination : undefined)
  const backendPresentationContext = destinationHint
    ? JSON.stringify(buildTripIntelligence(destinationHint, request), null, 2)
    : "Sem dados estruturados adicionais do backend."

  console.time("openai-call")

  try {
    const response = await client.responses.parse({
      model: "gpt-4.1-mini",
      max_output_tokens: 1400,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Responda em português do Brasil, com acentuação correta, e devolva apenas JSON estruturado.",
                "Você é um planejador de viagens para público brasileiro.",
                "Você é a camada de apresentação do VUEI. Não invente scores, custos ou dados estruturados. Use os dados calculados pelo backend como fonte principal. Sua função é explicar, humanizar, organizar o roteiro e deixar claras as premissas.",
                "Você não pode retornar valores genéricos. Os valores devem variar de acordo com destino, duração, quantidade de pessoas e perfil de viagem. Sempre explique as premissas usadas.",
                "Sempre interprete o destino pedido, o período informado, a duração estimada e a quantidade de pessoas.",
                "Use sempre moeda BRL.",
                "Os custos precisam diferenciar destinos nacionais e internacionais.",
                "Premium deve ser maior que intermediário, que deve ser maior que econômico.",
                "O breakdown é obrigatório e deve incluir: passagens, hospedagem, alimentação, transporte local e passeios.",
                "Não invente preço exato de passagem ou hotel; trate tudo como estimativa realista.",
                "Sempre inclua três variações: economic, intermediate e premium.",
                "Se houver scores e explicações do backend, use esses valores literalmente como referência.",
              ].join(" "),
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
            {
              type: "input_text",
              text: `Contexto estruturado do backend VUEI:
${backendPresentationContext}`,
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
  return normalizeTripResult(matched?.result ?? defaultTripResult, {
    origin: "busca",
    inputText: input,
  })
}

export function generateTripFromQuiz(answers: QuizAnswer): TripResult {
  const base = quizResultMap[answers.vibe]

  if (answers.region === "brasil") {
    return normalizeTripResult(base, {
      origin: "quiz",
      quizAnswers: answers,
    })
  }

  if (answers.vibe === "praia") {
    return normalizeTripResult(
      {
        ...base,
        destination: "Punta Cana",
        estimatedCost: answers.budget === "acima-8000" ? "R$ 8.600" : "R$ 6.900",
        bestFor: "praia, resort, descanso",
        context: "Boa para quem quer experiência simples de decidir e alta recompensa visual.",
        cheapestAlternative: "Cartagena",
      },
      {
        origin: "quiz",
        quizAnswers: answers,
      },
    )
  }

  return normalizeTripResult(
    {
      ...base,
      destination: "Portugal",
      estimatedCost: answers.budget === "ate-3000" ? "R$ 5.200" : base.estimatedCost,
      bestFor: "cultura, gastronomia, praticidade",
      cheapestAlternative: "Porto",
    },
    {
      origin: "quiz",
      quizAnswers: answers,
    },
  )
}
