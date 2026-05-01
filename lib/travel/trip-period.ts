import type { TripGenerationInput } from "@/types/trip"
import type { TravelDestinationData } from "@/lib/travel/travelKnowledgeBase"

type UserTravelProfileLike = {
  budgetLevel: "low" | "medium" | "high"
  prefersNature: boolean
  prefersCulture: boolean
  prefersBeach: boolean
  prefersSnow: boolean
  prefersFood: boolean
  prefersNightlife: boolean
  prefersShopping: boolean
  prefersParks: boolean
  prefersLuxury: boolean
  travelers: number
  durationDays: number
  month?: number
  travelStyle: string
}

export type ResolvedTripPeriod = {
  periodLabel: string
  startDate?: string
  endDate?: string
  durationDays: number
  isSuggestedPeriod: boolean
  periodReason: string
}

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "marco",
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

export function getTripMonth(period: {
  startDate?: string
  periodLabel?: string
  isSuggestedPeriod?: boolean
}): number {
  if (period.startDate) {
    const normalized = normalizeText(period.startDate)
    const monthIndex = MONTHS_PT.findIndex((month) => normalized.includes(month))
    if (monthIndex >= 0) return monthIndex + 1

    const isoMatch = normalized.match(/\d{4}-(\d{2})-\d{2}/)
    if (isoMatch) return Math.max(1, Math.min(12, Number.parseInt(isoMatch[1], 10)))

    const brMatch = normalized.match(/\d{2}\/(\d{2})\/\d{4}/)
    if (brMatch) return Math.max(1, Math.min(12, Number.parseInt(brMatch[1], 10)))
  }

  if (period.periodLabel) {
    const normalized = normalizeText(period.periodLabel)
    const monthIndex = MONTHS_PT.findIndex((month) => normalized.includes(month))
    if (monthIndex >= 0) return monthIndex + 1
  }

  return new Date().getMonth() + 1
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function resolveSuggestedYear(month: number) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  return month >= currentMonth ? currentYear : currentYear + 1
}

function formatMonthLabel(month: number, includeYear = true) {
  const monthName = MONTHS_PT[Math.max(0, Math.min(11, month - 1))]
  return includeYear ? `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${resolveSuggestedYear(month)}` : monthName
}

function resolveDurationDays(request: TripGenerationInput, destinationData?: TravelDestinationData) {
  switch (request.quizAnswers?.duration) {
    case "fim-de-semana":
      return 3
    case "4-6-dias":
      return 5
    case "7-10-dias":
      return 8
    case "11+-dias":
      return 12
  }

  const text = normalizeText(request.inputText)
  const explicit = text.match(/(\d{1,2})\s*dias?/)
  if (explicit) return Math.max(2, Number.parseInt(explicit[1], 10))
  if (text.includes("fim de semana")) return 3
  if (text.includes("duas semanas")) return 14
  return destinationData?.recommendedTripDays?.[0] ?? 5
}

function parseInputPeriod(request: TripGenerationInput, destinationData?: TravelDestinationData): ResolvedTripPeriod | null {
  const durationDays = resolveDurationDays(request, destinationData)
  const normalizedInput = normalizeText(request.inputText)

  const dateRangeMatch = normalizedInput.match(
    /(\d{1,2})\s*(?:a|-|ate)\s*(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
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
      isSuggestedPeriod: false,
      periodReason: "Periodo informado pelo usuario na busca.",
    }
  }

  const dayMonthMatch = normalizedInput.match(
    /(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
  )

  if (dayMonthMatch) {
    const month = dayMonthMatch[2].toLowerCase()
    const startDay = dayMonthMatch[1].padStart(2, "0")
    return {
      periodLabel: `${dayMonthMatch[1]} de ${month}`,
      startDate: `${startDay} de ${month}`,
      durationDays,
      isSuggestedPeriod: false,
      periodReason: "Periodo informado pelo usuario na busca.",
    }
  }

  const monthIndex = MONTHS_PT.findIndex((month) => normalizedInput.includes(month))
  if (monthIndex >= 0) {
    const monthNumber = monthIndex + 1
    return {
      periodLabel: formatMonthLabel(monthNumber),
      durationDays,
      isSuggestedPeriod: false,
      periodReason: "Mes informado pelo usuario e preservado como base da viagem.",
    }
  }

  return null
}

function scoreSuggestedMonth(month: number, destinationData: TravelDestinationData, userProfile: UserTravelProfileLike) {
  const climate = destinationData.climateByMonth[month]
  const crowd = destinationData.crowdIndexByMonth[month] ?? 55
  let score = climate?.comfortScore ?? 65

  score += Math.max(0, 80 - crowd) * 0.22

  if (destinationData.lowSeasonMonths.includes(month)) {
    score += userProfile.budgetLevel === "low" ? 16 : 9
  }

  if (destinationData.highSeasonMonths.includes(month)) {
    score -= userProfile.budgetLevel === "low" ? 16 : userProfile.prefersLuxury ? 2 : 8
  }

  if (userProfile.prefersSnow) {
    score += (climate?.snowProbability ?? 0) * 0.25
    if ((climate?.snowProbability ?? 0) < 20) score -= 14
  }

  if (userProfile.prefersBeach) {
    if ((climate?.avgTemp ?? 0) >= 24 && (climate?.avgTemp ?? 0) <= 31) score += 14
    if ((climate?.rainProbability ?? 0) > 45) score -= 14
  }

  if (userProfile.prefersNature) score += destinationData.natureScore * 0.06
  if (userProfile.prefersCulture) score += destinationData.cultureScore * 0.05
  if (userProfile.prefersFood) score += destinationData.foodScore * 0.04
  if (userProfile.prefersNightlife) score += destinationData.nightlifeScore * 0.04
  if (userProfile.prefersShopping) score += destinationData.walkabilityScore * 0.03
  if (userProfile.prefersParks) score += destinationData.familyScore * 0.03
  if (userProfile.travelers >= 3 && crowd > 78) score -= 8
  if (userProfile.travelStyle === "luxo" || userProfile.prefersLuxury) score += destinationData.safetyScore * 0.03

  return score
}

function buildSuggestedReason(month: number, destinationData: TravelDestinationData, userProfile: UserTravelProfileLike) {
  const climate = destinationData.climateByMonth[month]
  const reasons = ["clima"]

  if (destinationData.lowSeasonMonths.includes(month) || userProfile.budgetLevel === "low") reasons.push("custo")
  if ((destinationData.crowdIndexByMonth[month] ?? 100) <= 70) reasons.push("lotacao")
  if (userProfile.prefersSnow || userProfile.prefersBeach || userProfile.prefersNature || userProfile.prefersCulture) reasons.push("perfil")

  const uniqueReasons = Array.from(new Set(reasons))
  const baseReason = `Periodo sugerido pelo VUEI com base em ${uniqueReasons.join(", ")} e no perfil da viagem.`

  if (userProfile.prefersSnow && (climate?.snowProbability ?? 0) > 40) {
    return `${baseReason} Esse mes aumenta a chance de neve e combina melhor com a proposta do destino.`
  }

  if (userProfile.prefersBeach && (climate?.rainProbability ?? 0) <= 40) {
    return `${baseReason} O clima tende a ficar mais favoravel para praia, com menor risco de chuva.`
  }

  if (destinationData.lowSeasonMonths.includes(month)) {
    return `${baseReason} A combinacao entre clima mais estavel e menor pressao de preco melhora o custo-beneficio.`
  }

  return `${baseReason} O mes escolhido entrega uma boa combinacao entre conforto, custo e experiencia no destino.`
}

export function resolveTripPeriod(
  request: TripGenerationInput,
  destinationData: TravelDestinationData,
  userProfile: UserTravelProfileLike,
): ResolvedTripPeriod {
  const informedPeriod = parseInputPeriod(request, destinationData)
  if (informedPeriod) return informedPeriod

  const durationDays = userProfile.durationDays > 0 ? userProfile.durationDays : resolveDurationDays(request, destinationData)
  const bestMonths = destinationData.bestMonths?.filter((month) => month >= 1 && month <= 12) ?? []

  const suggestedMonth =
    bestMonths[0] ??
    Array.from({ length: 12 }, (_, index) => index + 1)
      .map((month) => ({
        month,
        score: scoreSuggestedMonth(month, destinationData, userProfile),
      }))
      .sort((left, right) => right.score - left.score)[0]?.month ??
    1

  return {
    periodLabel: formatMonthLabel(suggestedMonth),
    durationDays: durationDays || destinationData.recommendedTripDays[0] || 5,
    isSuggestedPeriod: true,
    periodReason: buildSuggestedReason(suggestedMonth, destinationData, userProfile),
  }
}
