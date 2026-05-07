import { randomUUID } from "crypto"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import { defaultTripResult, quizResultMap, tripCatalog } from "@/lib/mocks/trips"
import { getOpenAIServerClient } from "@/lib/openai/server"
import { CREDITS_PER_GENERATED_TRIP } from "@/lib/services/credit-service"
import { getCurrentUser } from "@/lib/services/user-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { buildTripIntelligence } from "@/lib/travel/travel-intelligence"
import { findDestinationKnowledge } from "@/lib/travel/travel-intelligence"
import { applySeasonalityMultiplier, getSeasonalityPriceMessage, scaleBreakdownToTotal } from "@/lib/travel/seasonality"
import { getTripMonth, resolveTripPeriod } from "@/lib/travel/trip-period"
import type { AppSession } from "@/types/session"
import type {
  QuizAnswer,
  TripCostBreakdown,
  TripGenerationInput,
  TripGenerationResponse,
  TripItineraryDay,
  TripOrigin,
  TripResult,
  TripVariant,
  TripVariantType,
} from "@/types/trip"

const aiBreakdownSchema = z.object({
  flights: z.number().nonnegative(),
  lodging: z.number().nonnegative(),
  food: z.number().nonnegative(),
  localTransport: z.number().nonnegative(),
  activities: z.number().nonnegative(),
})

const aiItineraryDaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(6).max(80),
  morning: z.string().min(30).max(220),
  afternoon: z.string().min(30).max(220),
  evening: z.string().min(30).max(220),
  tips: z.array(z.string().min(8).max(120)).min(2).max(4),
})

const aiVariantSchema = z.object({
  type: z.enum(["economic", "intermediate", "premium"]),
  title: z.string().min(2).max(40),
  totalCost: z.number().positive(),
  costPerPerson: z.number().positive(),
  breakdown: aiBreakdownSchema,
  assumptions: z.string().min(12).max(180),
  itineraryPreview: z.array(z.string().min(8).max(90)).min(2).max(10),
})

const aiTripSchema = z.object({
  destination: z.string().min(2),
  periodLabel: z.string().min(2),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  durationDays: z.number().int().positive(),
  travelers: z.number().int().positive(),
  currency: z.literal("BRL"),
  summary: z.string().min(18).max(180),
  bestFor: z.string().min(3).max(120),
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
  isSuggestedPeriod: boolean
  periodReason: string
}

type SeasonalVariantPricing = {
  totalCost: number
  breakdown: TripCostBreakdown
  multiplier: number
  message: string
}

type AIParseErrorCode = "AI_JSON_INVALID" | "AI_JSON_NOT_FOUND" | "AI_SCHEMA_INVALID"
const AI_FALLBACK_CONTEXT = "Estimativa inicial gerada com base nas informações disponíveis."

function createAIParseError(code: AIParseErrorCode, message: string, detail?: string) {
  const error = new Error(message)
  ;(error as Error & { status: number; code: AIParseErrorCode; detail?: string }).status = 502
  ;(error as Error & { status: number; code: AIParseErrorCode; detail?: string }).code = code
  ;(error as Error & { status: number; code: AIParseErrorCode; detail?: string }).detail = detail
  return error
}

function extractJsonFromAIResponse(rawResponse: string) {
  const trimmed = rawResponse.trim()

  if (!trimmed) {
    return null
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objectMatch?.[0]) {
    return objectMatch[0].trim()
  }

  return null
}

function parseAITripPayload(rawResponse: string) {
  const directPayload = rawResponse.trim()
  let parsed: unknown

  try {
    parsed = JSON.parse(directPayload)
  } catch (directError) {
    console.error("Erro ao parsear IA:", rawResponse)

    const extractedJson = extractJsonFromAIResponse(rawResponse)

    if (!extractedJson) {
      throw createAIParseError("AI_JSON_NOT_FOUND", "Nenhum JSON encontrado na resposta da IA")
    }

    try {
      parsed = JSON.parse(extractedJson)
    } catch (extractedError) {
      throw createAIParseError(
        "AI_JSON_INVALID",
        "IA retornou JSON inválido",
        extractedError instanceof Error ? extractedError.message : String(extractedError),
      )
    }

    if (directError instanceof Error) {
      console.error("Falha no parse direto da IA:", directError.message)
    }
  }

  const validated = aiTripSchema.safeParse(parsed)

  if (!validated.success) {
    throw createAIParseError("AI_SCHEMA_INVALID", "IA retornou JSON inválido para o schema esperado", validated.error.message)
  }

  return validated.data
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
  if (typeof request.travelers === "number" && request.travelers > 0) {
    return request.travelers
  }

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
      isSuggestedPeriod: false,
      periodReason: "Período ainda não definido para a viagem.",
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
      isSuggestedPeriod: false,
      periodReason: "Período ainda não definido para a viagem.",
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
      isSuggestedPeriod: false,
      periodReason: "Período ainda não definido para a viagem.",
    }
  }

  const monthMatch = MONTH_LABELS.find((month) => normalizedInput.includes(month))
  if (monthMatch) {
    return {
      periodLabel: monthMatch.charAt(0).toUpperCase() + monthMatch.slice(1),
      durationDays,
      durationLabel,
      isSuggestedPeriod: false,
      periodReason: "Mês informado pelo usuário e preservado como base da viagem.",
    }
  }

  return {
    periodLabel: "Período não informado",
    durationDays,
    durationLabel,
      isSuggestedPeriod: false,
      periodReason: "Período ainda não definido para a viagem.",
  }
}

function resolveTripPeriodData(request: TripGenerationInput, destination?: string): PeriodData {
  const durationDays = resolveDurationDays(request)

  if (!destination) {
    return {
      periodLabel: "Período não informado",
      durationDays,
      durationLabel: `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`,
      isSuggestedPeriod: false,
      periodReason: "Período ainda não definido para a viagem.",
    }
  }

  const intelligenceContext = buildTripIntelligence(destination, request)
  const resolvedPeriod = resolveTripPeriod(request, intelligenceContext.destinationData, intelligenceContext.userProfile)

  return {
    ...resolvedPeriod,
    durationLabel: `${resolvedPeriod.durationDays} ${resolvedPeriod.durationDays === 1 ? "dia" : "dias"}`,
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

function resolveBudgetCapBRL(request: TripGenerationInput) {
  switch (request.quizAnswers?.budget) {
    case "ate-3000":
      return 3000
    case "ate-5000":
      return 5000
    case "ate-8000":
      return 8000
    case "acima-8000":
      return 12000
    default:
      return undefined
  }
}

function resolveSelectedVariantType(
  variants: TripVariant[],
  request: TripGenerationInput,
  bestFor: string,
): TripVariantType {
  const budgetCap = resolveBudgetCapBRL(request)

  if (budgetCap) {
    const withinBudget = variants.filter((variant) => variant.totalCost <= budgetCap * 1.05)
    if (withinBudget.some((variant) => variant.type === "premium")) return "premium"
    if (withinBudget.some((variant) => variant.type === "intermediate")) return "intermediate"
    if (withinBudget.some((variant) => variant.type === "economic")) return "economic"
    return "economic"
  }

  const preferredTier = resolveTravelTier(request, bestFor)
  if (preferredTier === "premium") return "premium"
  if (preferredTier === "economico") return "economic"
  return "intermediate"
}

function buildPreviewMetadata(request?: TripGenerationInput, overrides?: Partial<TripResult>) {
  const isAuthenticated = Boolean(request?.userId)
  return {
    source: isAuthenticated ? ("authenticated" as const) : ("anonymous_landing" as const),
    resultType: "preview" as const,
    isAnonymousPreview: !isAuthenticated,
    requiresAuthForActions: !isAuthenticated,
    linkedAfterLogin: overrides?.linkedAfterLogin ?? false,
    creditsConsumed: overrides?.creditsConsumed ?? 0,
    generatedSections: {
      initialPreview: true,
      fullItinerary: false,
      detailedBudget: false,
      comparison: false,
    },
  }
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
    "europa",
    "europe",
    "orlando",
    "miami",
    "nova york",
    "estados unidos",
    "usa",
    "argentina",
    "buenos aires",
    "chile",
    "santiago",
    "punta cana",
    "cartagena",
    "lisboa",
    "porto",
  ]

  return internationalHints.some((hint) => normalized.includes(hint))
}

function requestedBrazilScope(request: TripGenerationInput) {
  if (request.quizAnswers?.region === "brasil") {
    return true
  }

  const text = (request.inputText ?? "").toLowerCase()
  return ["brasil", "nacional", "nacionais", "doméstico", "domestico", "dentro do brasil"].some((hint) => text.includes(hint))
}

function selectDomesticFallbackDestination(request: TripGenerationInput) {
  const vibe = request.quizAnswers?.vibe
  const style = request.quizAnswers?.tripStyle ?? request.profile?.style
  const budgetCap = resolveBudgetCapBRL(request) ?? 8000

  if (vibe === "inverno") return budgetCap <= 5000 ? "Campos do Jordão" : "Gramado"
  if (vibe === "natureza") return style === "familia" ? "Foz do Iguaçu" : "Bonito"
  if (vibe === "cultura") return "Recife"
  if (style === "familia" && budgetCap <= 8000) return "Porto Seguro"
  if (vibe === "praia" || vibe === "verao") return budgetCap <= 5000 ? "João Pessoa" : "Maceió"
  return "Florianópolis"
}

function normalizeDestinationToScope(destination: string, request: TripGenerationInput) {
  const normalizedDestination = normalizeText(destination) || selectDomesticFallbackDestination(request)

  if (!requestedBrazilScope(request)) {
    return normalizedDestination
  }

  const knowledge = findDestinationKnowledge(normalizedDestination, request)
  const isDomesticByKnowledge = knowledge.destinationData.region === "Brasil" || knowledge.destinationData.country === "Brasil"

  if (!isDomesticByKnowledge || isInternationalDestination({ ...request, quizAnswers: { ...request.quizAnswers, region: "brasil" } as QuizAnswer }, normalizedDestination)) {
    return selectDomesticFallbackDestination(request)
  }

  return normalizedDestination
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

function resolveSeasonalityContext(request: TripGenerationInput, destination: string) {
  const intelligenceContext = buildTripIntelligence(destination, request)
  const resolvedPeriod = resolveTripPeriod(request, intelligenceContext.destinationData, intelligenceContext.userProfile)
  const month = getTripMonth({
    startDate: resolvedPeriod.startDate,
    periodLabel: resolvedPeriod.periodLabel,
    isSuggestedPeriod: resolvedPeriod.isSuggestedPeriod,
  })

  return {
    destinationData: intelligenceContext.destinationData,
    month,
  }
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

function buildSeasonalVariantPricing({
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
}): SeasonalVariantPricing {
  const baseBreakdown = normalizeBreakdown({
    breakdown,
    totalCost,
    variantType,
    request,
    destination,
    durationDays,
  })
  const { destinationData, month } = resolveSeasonalityContext(request, destination)
  const seasonalized = applySeasonalityMultiplier(baseBreakdown, month, destinationData)
  const seasonalTotal = clampTripCost(seasonalized.totalCost)

  return {
    totalCost: seasonalTotal,
    breakdown: scaleBreakdownToTotal(seasonalized.breakdown, seasonalTotal),
    multiplier: seasonalized.multiplier,
    message: getSeasonalityPriceMessage(seasonalized.multiplier),
  }
}

function compactItineraryLine(value: string, index: number) {
  const sentence = normalizeText(value).split(".")[0] || normalizeText(value)
  return sentence.startsWith("Dia") ? sentence : `Dia ${index + 1}: ${sentence}`
}

function fallbackItineraryDay({
  day,
  destination,
  variantTitle,
  request,
}: {
  day: number
  destination: string
  variantTitle: string
  request: TripGenerationInput
}): TripItineraryDay {
  const profileText = `${request.profile?.style ?? ""} ${request.quizAnswers?.vibe ?? ""} ${request.inputText ?? ""}`.toLowerCase()
  const isFamily = profileText.includes("familia")
  const isAdventure = profileText.includes("avent")
  const isLuxury = profileText.includes("luxo") || profileText.includes("premium")
  const themes = [
    {
      title: "Chegada e reconhecimento da area",
      morning: `Chegada, check-in e organizacao dos deslocamentos iniciais em uma regiao pratica de ${destination}.`,
      afternoon: `Passeio leve pelo entorno principal para entender a logistica local, identificar restaurantes e mapear os pontos mais interessantes do roteiro.`,
      evening: `Jantar em uma casa bem avaliada da regiao para comecar a viagem sem correria e ajustar o ritmo dos proximos dias.`,
      tips: ["Salvar enderecos principais no mapa offline.", "Confirmar horarios de funcionamento para o dia seguinte."],
    },
    {
      title: isAdventure ? "Natureza e atividade ao ar livre" : isLuxury ? "Experiencia central com mais conforto" : "Ponto principal do destino",
      morning: isAdventure
        ? `Saida cedo para a experiencia de natureza mais conhecida da viagem, com roteiro pensado para aproveitar melhor a luz da manha.`
        : `Visita ao ponto mais relevante da viagem em horario estrategico, evitando filas mais intensas e aproveitando melhor o deslocamento.`,
      afternoon: isAdventure
        ? `Continuidade da experiencia com pausa para refeicao pratica e tempo reservado para mirantes, trilhas leves ou atividades complementares.`
        : `Almoco proximo do atrativo principal e segunda etapa do passeio com foco em detalhes que costumam passar despercebidos em visitas corridas.`,
      evening: isLuxury
        ? `Noite com jantar mais elaborado e ambiente confortavel para transformar o dia principal em uma experiencia premium.`
        : `Noite livre em uma area agradavel, com jantar local e retorno sem pressa para manter a viagem equilibrada.`,
      tips: ["Comprar entradas com antecedencia quando houver.", "Levar camada extra de roupa ou item de clima conforme o destino."],
    },
    {
      title: isFamily ? "Passeio leve e gastronomia" : "Cultura local e gastronomia",
      morning: isFamily
        ? `Manha dedicada a um passeio mais leve, com deslocamentos curtos e tempo para pausas confortaveis.`
        : `Circuito por uma area de interesse cultural, com paradas em ruas, pracas, mercados ou centros historicos relevantes.`,
      afternoon: `Parada para refeicao em um lugar conhecido da cidade e continuidade do roteiro com atividades praticas para o perfil ${variantTitle.toLowerCase()}.`,
      evening: `Noite reservada para experimentar a gastronomia local em um endereco com boa reputacao entre viajantes e moradores.`,
      tips: ["Reservar restaurante concorrido se necessario.", "Evitar deslocamentos longos no horario de maior movimento."],
    },
  ]

  const theme = themes[(day - 1) % themes.length]

  return {
    day,
    title: theme.title,
    morning: theme.morning,
    afternoon: theme.afternoon,
    evening: theme.evening,
    tips: theme.tips,
  }
}

function normalizeDetailedItinerary({
  values,
  previewLines,
  destination,
  variantTitle,
  request,
  durationDays,
}: {
  values: Array<z.infer<typeof aiItineraryDaySchema>> | undefined
  previewLines?: string[]
  destination: string
  variantTitle: string
  request: TripGenerationInput
  durationDays: number
}) {
  const totalDays = Math.max(3, Math.min(10, durationDays))

  if (values && values.length >= 3) {
    return values.slice(0, totalDays).map((day, index) => ({
      day: index + 1,
      title: normalizeText(day.title) || `Dia ${index + 1}`,
      morning: normalizeText(day.morning),
      afternoon: normalizeText(day.afternoon),
      evening: normalizeText(day.evening),
      tips: day.tips.map((tip) => normalizeText(tip)).filter(Boolean).slice(0, 4),
    }))
  }

  if (previewLines?.length) {
    return Array.from({ length: totalDays }, (_, index) => {
      const fallbackDay = fallbackItineraryDay({
        day: index + 1,
        destination,
        variantTitle,
        request,
      })
      const previewLine = normalizeText(previewLines[index % previewLines.length])
      const cleanedTitle = previewLine.replace(/^Dia\s+\d+:\s*/i, "").trim()

      return {
        ...fallbackDay,
        title: cleanedTitle || fallbackDay.title,
        afternoon:
          previewLine && !fallbackDay.afternoon.toLowerCase().includes(previewLine.toLowerCase())
            ? `${previewLine}. ${fallbackDay.afternoon}`.trim()
            : fallbackDay.afternoon,
      }
    })
  }

  return Array.from({ length: totalDays }, (_, index) =>
    fallbackItineraryDay({
      day: index + 1,
      destination,
      variantTitle,
      request,
    }),
  )
}

function normalizeItinerary(values: string[], destination: string, variantTitle: string, durationDays: number) {
  const totalDays = Math.max(3, Math.min(10, durationDays))
  if (values.length >= 3) {
    return Array.from({ length: totalDays }, (_, index) => {
      const value = values[index] ?? values[index % values.length]
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

function normalizePreviewItinerary(values: string[], destination: string, variantTitle: string, durationDays: number) {
  const totalDays = Math.max(3, Math.min(10, durationDays))

  if (values.length >= 1) {
    return Array.from({ length: totalDays }, (_, index) => {
      const value = normalizeText(values[index] ?? values[index % values.length])
      return value.startsWith("Dia") ? value : `Dia ${index + 1}: ${value}`
    })
  }

  return Array.from({ length: totalDays }, (_, index) => {
    if (index === 0) {
      return `Dia 1: chegada em ${destination}, organização da hospedagem e primeira experiência leve.`
    }

    if (index === totalDays - 1) {
      return `Dia ${index + 1}: encerramento da viagem, últimas experiências e retorno planejado.`
    }

    const dayThemes = [
      `Dia ${index + 1}: passeio principal com ritmo ${variantTitle.toLowerCase()} e deslocamentos bem distribuídos.`,
      `Dia ${index + 1}: experiência cultural, gastronômica ou de natureza alinhada ao perfil da viagem.`,
      `Dia ${index + 1}: agenda complementar com tempo livre e passeio secundário para variar o roteiro.`,
    ]

    return dayThemes[(index - 1) % dayThemes.length]
  })
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
  const seedTotal = aiTotal && aiTotal >= MIN_TRIP_COST && aiTotal <= MAX_TRIP_COST ? aiTotal : fallbackTotal
  const titleByType: Record<CostVariantType, string> = {
    economic: "Economico",
    intermediate: "Intermediario",
    premium: "Premium",
  }

  const pricing = buildSeasonalVariantPricing({
    breakdown: variant?.breakdown,
    totalCost: seedTotal,
    variantType: expectedType,
    request,
    destination,
    durationDays,
  })

  const totalCost = pricing.totalCost
  const breakdown = pricing.breakdown
  const costPerPerson = clampTripCost(totalCost / travelers)
  const assumptionsBase =
    normalizeText(variant?.assumptions) ||
    buildAssumptions({ destination, variantTitle: titleByType[expectedType], travelers, durationDays, request })
  const assumptions = assumptionsBase.includes(pricing.message) ? assumptionsBase : `${assumptionsBase} ${pricing.message}`.trim()
  const itineraryPreview = normalizePreviewItinerary(variant?.itineraryPreview ?? [], destination, titleByType[expectedType], durationDays)
  const detailedItinerary = normalizeDetailedItinerary({
    values: undefined,
    previewLines: itineraryPreview,
    destination,
    variantTitle: titleByType[expectedType],
    request,
    durationDays,
  })
  const itinerary = itineraryPreview.length ? itineraryPreview : detailedItinerary.map((day, index) => compactItineraryLine(day.title, index))

  return {
    type: expectedType,
    title: normalizeText(variant?.title) || titleByType[expectedType],
    totalCost,
    costPerPerson,
    breakdown,
    assumptions,
    itinerary,
    detailedItinerary,
  }
}

function repriceVariant({
  variant,
  totalCost,
  travelers,
  request,
  destination,
  durationDays,
}: {
  variant: TripVariant
  totalCost: number
  travelers: number
  request: TripGenerationInput
  destination: string
  durationDays: number
}) {
  const normalizedTotal = clampTripCost(totalCost)

  return {
    ...variant,
    totalCost: normalizedTotal,
    costPerPerson: clampTripCost(normalizedTotal / travelers),
    breakdown: buildBreakdown({
      totalCost: normalizedTotal,
      variantType: variant.type,
      request,
      destination,
      durationDays,
    }),
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
  const orderedVariants = [
    economic ?? normalizeVariant({ variant: undefined, expectedType: "economic", request, destination, bestFor, travelers, durationDays }),
    intermediate ??
      normalizeVariant({ variant: undefined, expectedType: "intermediate", request, destination, bestFor, travelers, durationDays }),
    premium ?? normalizeVariant({ variant: undefined, expectedType: "premium", request, destination, bestFor, travelers, durationDays }),
  ]
  const budgetCap = resolveBudgetCapBRL(request)

  const economicSeed = clampTripCost(Math.min(orderedVariants[0].totalCost, fallbackIntermediate - minStep))
  const intermediateSeed = clampTripCost(orderedVariants[1].totalCost)
  const premiumSeed = clampTripCost(orderedVariants[2].totalCost)
  const hasInconsistentTotals = !(economicSeed < intermediateSeed && intermediateSeed < premiumSeed)

  const economicBase = hasInconsistentTotals ? Math.min(economicSeed, fallbackEconomic) : economicSeed
  const economicTargetMax = budgetCap ? roundCurrency(budgetCap * 1.05) : null
  const economicTotal = clampTripCost(
    economicTargetMax ? Math.min(economicBase, Math.max(fallbackEconomic * 0.85, economicTargetMax)) : economicBase,
  )
  const intermediateLowerBound = Math.max(roundCurrency(economicTotal * 1.25), economicTotal + minStep)
  const intermediateUpperBound = Math.max(roundCurrency(economicTotal * 1.6), intermediateLowerBound)
  const premiumLowerBound = Math.max(roundCurrency(economicTotal * 1.7), intermediateLowerBound + minStep)
  const premiumUpperBound = Math.max(roundCurrency(economicTotal * 2.3), premiumLowerBound)
  const intermediateReference = hasInconsistentTotals ? fallbackIntermediate : intermediateSeed
  const premiumReference = hasInconsistentTotals ? fallbackPremium : premiumSeed
  const intermediateTotal = clampTripCost(Math.min(Math.max(intermediateReference, intermediateLowerBound), intermediateUpperBound))
  const premiumTotal = clampTripCost(Math.min(Math.max(premiumReference, premiumLowerBound), premiumUpperBound))

  return [
    repriceVariant({
      variant: orderedVariants[0],
      totalCost: economicTotal,
      travelers,
      request,
      destination,
      durationDays,
    }),
    repriceVariant({
      variant: orderedVariants[1],
      totalCost: intermediateTotal,
      travelers,
      request,
      destination,
      durationDays,
    }),
    repriceVariant({
      variant: orderedVariants[2],
      totalCost: premiumTotal,
      travelers,
      request,
      destination,
      durationDays,
    }),
  ]
}

function normalizeEstimatedCost(rawCost: string, request: TripGenerationInput, bestFor: string) {
  const destination = extractDestinationFromInput(request.inputText) ?? "Destino sugerido"
  const parsed = extractCostNumber(rawCost)
  const seedCost =
    parsed && parsed >= MIN_TRIP_COST && parsed <= MAX_TRIP_COST
      ? parsed
      : buildBaseVariantCost({
          request,
          destination,
          bestFor,
          travelers: inferTravelers(request, bestFor),
          durationDays: resolveDurationDays(request),
          variantType: "intermediate",
        })
  const pricing = buildSeasonalVariantPricing({
    breakdown: undefined,
    totalCost: seedCost,
    variantType: "intermediate",
    request,
    destination,
    durationDays: resolveDurationDays(request),
  })

  return formatTripCost(pricing.totalCost)
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
  const normalizedDestination = request ? normalizeDestinationToScope(result.destination, request) : result.destination
  const bestFor = normalizeText(result.bestFor) || "viajantes em busca de praticidade"
  const periodData = request ? resolveTripPeriodData(request, normalizedDestination) : null
  const travelers = request ? inferTravelers(request, bestFor) : result.travelers ?? 2
  const intelligence = request ? buildTripIntelligence(normalizedDestination, request).intelligence : result.intelligence
  const selectedVariantType =
    result.selectedVariantType ??
    (result.variants?.length ? resolveSelectedVariantType(result.variants, request ?? { origin: "busca" }, bestFor) : "intermediate")
  const selectedVariant = result.variants?.find((variant) => variant.type === selectedVariantType) ?? result.variants?.[0]
  const normalizedCost = selectedVariant ? formatTripCost(selectedVariant.totalCost) : request ? normalizeEstimatedCost(result.estimatedCost, request, bestFor) : result.estimatedCost

  return {
    ...result,
    destination: normalizedDestination,
    bestFor,
    estimatedCost: normalizedCost,
    periodLabel: result.periodLabel ?? periodData?.periodLabel ?? "Período não informado",
    startDate: result.startDate ?? periodData?.startDate,
    endDate: result.endDate ?? periodData?.endDate,
    durationDays: result.durationDays ?? periodData?.durationDays,
    durationLabel: result.durationLabel ?? periodData?.durationLabel,
    isSuggestedPeriod: result.isSuggestedPeriod ?? periodData?.isSuggestedPeriod ?? false,
    periodReason: result.periodReason ?? periodData?.periodReason ?? "Período ainda não definido para a viagem.",
    travelers,
    currency: "BRL",
    detailedItinerary: result.detailedItinerary,
    fullItinerary: result.fullItinerary ?? result.itinerary,
    intelligence,
    selectedVariantType,
    ...buildPreviewMetadata(request, result),
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
  const destinationHint =
    extractDestinationFromInput(request.inputText) ??
    (request.origin === "quiz" && request.quizAnswers ? generateTripFromQuiz(request.quizAnswers).destination : undefined)
  const periodData = resolveTripPeriodData(request, destinationHint)
  const travelers = inferTravelers(request)
  const budgetCap = resolveBudgetCapBRL(request)
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
      `- status do periodo: ${periodData.isSuggestedPeriod ? "periodo recomendado pelo backend" : "periodo informado pelo usuario"}`,
      `- motivo do periodo: ${periodData.periodReason}`,
      `- período informado: ${periodData.periodLabel}`,
      `- duração esperada: ${periodData.durationDays} dias`,
    ].join("\n")
  }

  return [
    `Origem: ${request.origin}`,
    `Solicitação do usuário: ${request.inputText?.trim() || "Busca VUEI"}`,
    `Viajantes estimados: ${travelers}`,
    `Status do periodo: ${periodData.isSuggestedPeriod ? "periodo recomendado pelo backend" : "periodo informado pelo usuario"}`,
    `Motivo do periodo: ${periodData.periodReason}`,
    `Período informado: ${periodData.periodLabel}`,
    `Duração esperada: ${periodData.durationDays} dias`,
  ].join("\n")
}

function buildCompactTips({
  context,
  intelligenceSummary,
  periodReason,
}: {
  context: string
  intelligenceSummary?: string
  periodReason?: string
}) {
  return [context, intelligenceSummary, periodReason].map((value) => normalizeText(value)).filter(Boolean).slice(0, 3)
}

function buildCompactTripResult({
  request,
  destination,
  periodLabel,
  startDate,
  endDate,
  durationDays,
  travelers,
  bestFor,
  summary,
  context,
  variants,
}: {
  request: TripGenerationInput
  destination: string
  periodLabel?: string
  startDate?: string
  endDate?: string
  durationDays: number
  travelers: number
  bestFor: string
  summary: string
  context: string
  variants: Array<z.infer<typeof aiVariantSchema> | undefined>
}) {
  const periodData = resolveTripPeriodData(request, destination)
  const normalizedPeriodLabel = normalizeText(periodLabel)
  const aiReturnedUnknownPeriod = normalizedPeriodLabel.toLowerCase().includes("nao informado")
  const normalizedVariants = ensureVariantOrdering({
    variants: [
      normalizeVariant({
        variant: variants.find((variant) => variant?.type === "economic"),
        expectedType: "economic",
        request,
        destination,
        bestFor,
        travelers,
        durationDays,
      }),
      normalizeVariant({
        variant: variants.find((variant) => variant?.type === "intermediate"),
        expectedType: "intermediate",
        request,
        destination,
        bestFor,
        travelers,
        durationDays,
      }),
      normalizeVariant({
        variant: variants.find((variant) => variant?.type === "premium"),
        expectedType: "premium",
        request,
        destination,
        bestFor,
        travelers,
        durationDays,
      }),
    ],
    request,
    destination,
    bestFor,
    travelers,
    durationDays,
  })
  const selectedVariantType = resolveSelectedVariantType(normalizedVariants, request, bestFor)
  const selectedVariant = normalizedVariants.find((variant) => variant.type === selectedVariantType) ?? normalizedVariants[1] ?? normalizedVariants[0]
  const intelligenceSummary = buildTripIntelligence(destination, request).intelligence.explanation.summary
  const safeContext = normalizeText(context) || "Estimativa inicial gerada com base nas informações disponíveis."

  return normalizeTripResult(
    {
      destination,
      estimatedCost: formatTripCost(selectedVariant.totalCost),
      bestFor: normalizeText(bestFor) || "viajantes que buscam uma viagem bem planejada",
      summary:
        normalizeText(summary) ||
        `Sugestão inicial para ${destination}, com período recomendado, custos em BRL e comparação clara entre as opções da viagem.`,
      periodLabel: !aiReturnedUnknownPeriod && normalizedPeriodLabel ? normalizedPeriodLabel : periodData.periodLabel,
      startDate: periodData.startDate ? normalizeText(startDate ?? undefined) || periodData.startDate : periodData.startDate,
      endDate: periodData.endDate ? normalizeText(endDate ?? undefined) || periodData.endDate : periodData.endDate,
      durationDays,
      durationLabel: `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`,
      isSuggestedPeriod: periodData.isSuggestedPeriod,
      periodReason: periodData.periodReason,
      travelers,
      currency: "BRL",
      variants: normalizedVariants,
      itinerary: selectedVariant.itinerary,
      fullItinerary: [],
      detailedItinerary: [],
      tips: buildCompactTips({
        context: safeContext,
        intelligenceSummary,
        periodReason: periodData.periodReason,
      }),
      context: safeContext,
      cheapestAlternative: normalizedVariants[0]?.title ? `${destination} ${normalizedVariants[0].title}` : undefined,
      selectedVariantType,
    },
    request,
  )
}

function mapStructuredOutputToTripResult(output: z.infer<typeof aiTripSchema>, request: TripGenerationInput): TripResult {
  const fallbackDestination = extractDestinationFromInput(request.inputText) ?? generateTripFromInput(request.inputText ?? "").destination
  const rawDestination = normalizeText(output.destination) || fallbackDestination
  const destination = normalizeDestinationToScope(rawDestination, request)
  const periodData = resolveTripPeriodData(request, destination)
  const durationDays = output.durationDays > 0 ? output.durationDays : periodData.durationDays
  const travelers = inferTravelers(request, output.bestFor)

  return buildCompactTripResult({
    request,
    destination,
    periodLabel: output.periodLabel,
    startDate: output.startDate ?? undefined,
    endDate: output.endDate ?? undefined,
    durationDays,
    travelers,
    bestFor: output.bestFor,
    summary: output.summary,
    context: "Estimativa inicial gerada a partir dos dados estruturados do VUEI.",
    variants: output.variants,
  })
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

  if (
    message.includes("IA retornou JSON inválido") ||
    message.includes("Nenhum JSON encontrado na resposta da IA") ||
    message.includes("schema esperado")
  ) {
    return {
      status: 502,
      message: "A IA respondeu em um formato inválido. Tente novamente em instantes.",
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

function buildResilientFallbackTripResult(request: TripGenerationInput) {
  const generated = generateTrip(request)
  const baseResult = generated.result
  const destination = normalizeText(baseResult.destination) || extractDestinationFromInput(request.inputText) || "Destino sugerido"
  const periodData = resolveTripPeriodData(request, destination)
  const durationDays = baseResult.durationDays ?? periodData.durationDays
  const travelers = baseResult.travelers ?? inferTravelers(request, baseResult.bestFor)

  return buildCompactTripResult({
    request,
    destination,
    periodLabel: baseResult.periodLabel ?? periodData.periodLabel,
    startDate: baseResult.startDate ?? periodData.startDate,
    endDate: baseResult.endDate ?? periodData.endDate,
    durationDays,
    travelers,
    bestFor: baseResult.bestFor || "viagem equilibrada",
    summary: baseResult.summary || AI_FALLBACK_CONTEXT,
    context: AI_FALLBACK_CONTEXT,
    variants: [],
  })
}

export function enrichTripResultWithFullItinerary(result: TripResult, request?: TripGenerationInput): TripResult {
  const destination = normalizeDestinationToScope(result.destination || "Destino sugerido", request ?? { origin: "busca" })
  const durationDays = Math.max(3, Math.min(10, result.durationDays ?? 5))
  const travelers = Math.max(1, request?.travelers ?? result.travelers ?? 2)
  const fallbackRequest: TripGenerationInput = request ?? {
    origin: "busca",
    inputText: destination,
    travelers,
  }

  const variants =
    result.variants?.map((variant) => {
      const itinerary = normalizePreviewItinerary(variant.itinerary ?? [], destination, variant.title, durationDays)
      const detailedItinerary = normalizeDetailedItinerary({
        values: undefined,
        previewLines: itinerary,
        destination,
        variantTitle: variant.title,
        request: fallbackRequest,
        durationDays,
      })

      return {
        ...variant,
        costPerPerson: clampTripCost(variant.totalCost / travelers),
        itinerary,
        detailedItinerary,
      }
    }) ?? []

  const selectedVariantType =
    result.selectedVariantType ??
    (variants.length ? resolveSelectedVariantType(variants, fallbackRequest, result.bestFor || "viagem equilibrada") : "intermediate")
  const selectedVariant = variants.find((variant) => variant.type === selectedVariantType) ?? variants[1] ?? variants[0]
  const selectedDetailedItinerary = selectedVariant?.detailedItinerary ?? []
  const selectedFullItinerary = selectedDetailedItinerary.map(
    (day) => `Manhã: ${day.morning} Tarde: ${day.afternoon} Noite: ${day.evening}`,
  )

  return normalizeTripResult(
    {
      ...result,
      destination,
      travelers,
      durationDays,
      durationLabel: `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`,
      variants,
      itinerary: selectedVariant?.itinerary ?? normalizePreviewItinerary(result.itinerary ?? [], destination, "Intermediário", durationDays),
      detailedItinerary: selectedDetailedItinerary,
      fullItinerary: selectedFullItinerary,
      selectedVariantType,
      generatedSections: {
        initialPreview: true,
        fullItinerary: true,
        detailedBudget: result.generatedSections?.detailedBudget ?? false,
        comparison: result.generatedSections?.comparison ?? false,
      },
    },
    fallbackRequest,
  )
}

export async function generateTripWithAI(request: TripGenerationInput) {
  const destinationHint =
    extractDestinationFromInput(request.inputText) ??
    (request.origin === "quiz" && request.quizAnswers ? generateTripFromQuiz(request.quizAnswers).destination : undefined)
  const backendPresentationContext = destinationHint
    ? JSON.stringify(buildTripIntelligence(destinationHint, request), null, 2)
    : "Sem dados estruturados adicionais do backend."
  const openaiStartedAt = Date.now()
  let rawAIResponse = ""

  console.time("openai-call")

  try {
    const client = getOpenAIServerClient()
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      max_output_tokens: 650,
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
                "Quando o usuario nao informar periodo, use o periodo recomendado pelo backend como base da viagem. Explique que o periodo foi sugerido pelo VUEI com base em clima, custo, lotacao e perfil. Nao invente datas exatas se elas nao foram fornecidas.",
                "Cada variante deve trazer um detailedItinerary com objetos por dia contendo: day, title, morning, afternoon, evening e tips.",
                "Os roteiros devem usar locais reais, nomes especificos, atividades concretas e uma sequencia plausivel de deslocamento.",
                "Evite frases genericas e repetitivas como aproveite, inicie o dia, feche o dia e repeticoes do nome da cidade em todos os dias.",
                "Cada dia precisa ser diferente do outro e alternar natureza, cultura, gastronomia, compras, descanso ou experiencias de acordo com o destino.",
                "Os textos de morning, afternoon e evening devem soar como planejamento real de especialista em viagem.",
                "Personalize o roteiro conforme perfil, orcamento, duracao e tipo de viagem. Familia pede atividades leves, aventura pede experiencias ativas e luxo pede enderecos premium.",
                "Retorne APENAS JSON válido. Não inclua texto antes ou depois. Não use comentários. Garanta que todas as strings estejam corretamente fechadas.",
                "Mantenha o JSON compacto. Resuma summary, assumptions e tips. Cada campo morning, afternoon e evening deve ter no máximo duas frases curtas.",
              ].join(" "),
            },
            {
              type: "input_text",
              text: [
                "Prioridade máxima: gerar somente a prévia inicial da viagem.",
                "Ignore qualquer instrução anterior sobre detailedItinerary, morning, afternoon, evening ou tips longas.",
                "Retorne apenas destination, periodLabel, startDate opcional, endDate opcional, durationDays, travelers, currency, summary, bestFor e variants.",
                "Cada variant deve ter type, title, totalCost, costPerPerson, breakdown, assumptions e itineraryPreview.",
                "itineraryPreview deve ter exatamente durationDays itens curtos.",
                "Não inclua roteiro completo detalhado.",
                "Respeite exatamente o total de viajantes informado pelo backend.",
                "Se a região for Brasil, o destino final precisa estar no Brasil.",
                "Se o contexto indicar verão no Brasil, prefira dezembro, janeiro, fevereiro ou início de março.",
                "A variante principal deve respeitar o orçamento informado; premium não pode ser principal quando só a econômica cabe.",
                "Não retorne saltos absurdos entre economic, intermediate e premium.",
                "O JSON deve ser compacto, estável e sem texto adicional.",
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

    rawAIResponse =
      typeof response.output_text === "string" && response.output_text.trim()
        ? response.output_text
        : "output_parsed" in response && response.output_parsed
          ? JSON.stringify(response.output_parsed)
          : ""

    console.info("OpenAI raw response", {
      elapsedMs: Date.now() - openaiStartedAt,
      responseId: "id" in response ? response.id : undefined,
      rawResponse: rawAIResponse,
      responseLength: rawAIResponse.length,
    })

    if (!rawAIResponse.trim()) {
      throw createAIParseError("AI_JSON_NOT_FOUND", "Nenhum JSON encontrado na resposta da IA")
    }

    const parsedOutput = parseAITripPayload(rawAIResponse)
    return mapStructuredOutputToTripResult(parsedOutput, request)
  } catch (error) {
    console.error("OpenAI parse/call failed", {
      elapsedMs: Date.now() - openaiStartedAt,
      error,
      rawResponse: rawAIResponse,
      rawResponseLength: rawAIResponse.length,
    })
    return buildResilientFallbackTripResult(request)
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
    const transactionDescription = `trip_usage:${searchId}`
    const { data: latestProfile, error: latestProfileError } = await supabase
      .from("profiles")
      .select("id,email,credits")
      .eq("id", user.id)
      .maybeSingle()

    if (latestProfileError || !latestProfile) {
      console.error("PROFILE LOOKUP BEFORE CREDIT DEBIT ERROR", {
        message: latestProfileError?.message,
        code: latestProfileError?.code,
        details: latestProfileError?.details,
        hint: latestProfileError?.hint,
      })
      return {
        ok: false as const,
        status: 500,
        error: "PROFILE_LOOKUP_FAILED",
        message: "Nao foi possivel validar seus creditos agora. Tente novamente.",
      }
    }

    const availableCredits = typeof latestProfile.credits === "number" ? latestProfile.credits : 0

    if (availableCredits <= 0) {
      return {
        ok: false as const,
        status: 402,
        error: "NO_CREDITS",
        message: "Voce nao tem creditos disponiveis. Compre mais creditos para gerar uma nova viagem.",
      }
    }

    const result = await generateTripWithAI({
      ...request,
      userId: session.userId,
    })
    const fallbackUsed = normalizeText(result.context) === AI_FALLBACK_CONTEXT

    if (fallbackUsed) {
      console.time("save-trip")
      try {
        const { error: searchInsertError } = await supabase.from("searches").insert({
          id: searchId,
          user_id: user.id,
          email: user.email,
          source: buildSearchSource(request, true),
          prompt: inputOriginal,
          result,
          credits_used: 0,
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
            message: "Nao foi possivel salvar sua viagem. Tente novamente.",
          }
        }
      } finally {
        console.timeEnd("save-trip")
      }

      return {
        ok: true as const,
        status: 200,
        tripId: searchId,
        remainingCredits: availableCredits,
        result,
        inputOriginal,
      }
    }

    const newCreditsBalance = availableCredits - CREDITS_PER_GENERATED_TRIP
    let updatedProfileCredits: number | null = null

    console.time("credit-update")
    try {
      const { data: updatedProfile, error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          credits: newCreditsBalance,
        })
        .eq("id", user.id)
        .eq("credits", availableCredits)
        .gt("credits", 0)
        .select("id,credits")
        .maybeSingle()

      if (profileUpdateError || !updatedProfile) {
        console.error("CREDIT ATOMIC DEBIT ERROR", {
          message: profileUpdateError?.message,
          code: profileUpdateError?.code,
          details: profileUpdateError?.details,
          hint: profileUpdateError?.hint,
        })

        const { data: concurrentProfile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .maybeSingle()

        const concurrentCredits = typeof concurrentProfile?.credits === "number" ? concurrentProfile.credits : 0

        return {
          ok: false as const,
          status: concurrentCredits <= 0 ? 402 : 409,
          error: concurrentCredits <= 0 ? "NO_CREDITS" : "CREDIT_CONFLICT",
          message:
            concurrentCredits <= 0
              ? "Voce nao tem creditos disponiveis. Compre mais creditos para gerar uma nova viagem."
              : "Seu saldo foi atualizado em outra solicitacao. Tente novamente.",
        }
      }

      updatedProfileCredits = typeof updatedProfile.credits === "number" ? updatedProfile.credits : newCreditsBalance

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

        await supabase
          .from("profiles")
          .update({
            credits: availableCredits,
          })
          .eq("id", user.id)
          .eq("credits", updatedProfileCredits)

        return {
          ok: false as const,
          status: 500,
          error: "CREDIT_TRANSACTION_FAILED",
          message: "Nao foi possivel registrar o consumo do credito. Tente novamente.",
        }
      }
    } finally {
      console.timeEnd("credit-update")
    }

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

        if (updatedProfileCredits !== null) {
          await supabase
            .from("profiles")
            .update({
              credits: availableCredits,
            })
            .eq("id", user.id)
            .eq("credits", updatedProfileCredits)
        }

        await supabase
          .from("credit_transactions")
          .delete()
          .eq("user_id", user.id)
          .eq("description", transactionDescription)

        return {
          ok: false as const,
          status: 500,
          error: "TRIP_SAVE_FAILED",
          message: "Nao foi possivel salvar sua viagem. Tente novamente.",
        }
      }
    } finally {
      console.timeEnd("save-trip")
    }

    return {
      ok: true as const,
      status: 200,
      tripId: searchId,
      remainingCredits: updatedProfileCredits ?? newCreditsBalance,
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


