import { applySeasonalityMultiplier, getSeasonalityMultiplier, getSeasonalityPriceMessage } from "@/lib/travel/seasonality"
import { travelKnowledgeBase, travelRegionFallbacks, type TravelDestinationData } from "@/lib/travel/travelKnowledgeBase"
import { getTripMonth, resolveTripPeriod } from "@/lib/travel/trip-period"
import { defaultTripProfile, resolveTripProfileFallback, sanitizeTripProfileInput } from "@/lib/travel/trip-profile"
import type {
  OvercrowdingInsight,
  OvercrowdingLabel,
  SmartTimingInsight,
  SmartTimingLabel,
  TravelExplanation,
  TripDataConfidence,
  TripGenerationInput,
  TripIntelligence,
} from "@/types/trip"

export type UserTravelProfile = {
  budgetLevel: "low" | "medium" | "high"
  travelStyle: string
  pace: "light" | "balanced" | "intense"
  prefersNature: boolean
  prefersCulture: boolean
  prefersBeach: boolean
  prefersSnow: boolean
  prefersFood: boolean
  prefersNightlife: boolean
  prefersShopping: boolean
  prefersParks: boolean
  prefersLuxury: boolean
  dislikesLongFlights: boolean
  avoidsConnections: boolean
  acceptsConnections: boolean
  travelers: number
  durationDays: number
  origin: string
  destination?: string
  month?: number
}

type TravelKnowledgeMatch = {
  destinationData: TravelDestinationData
  dataConfidence: TripDataConfidence
  usedFallback: boolean
}

type ScoreBreakdown = {
  destinationMatchScore: number
  affordabilityScore: number
  smartTimingScore: SmartTimingInsight
  experienceScore: number
  climateComfortScore: number
  overcrowdingIndex: OvercrowdingInsight
  routeComfortScore: number
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

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function inferTravelers(request: TripGenerationInput) {
  if (request.profile?.style === "solo") return 1
  if (request.profile?.style === "casal") return 2
  if (request.profile?.style === "familia") return 3
  if (request.profile?.style === "amigos") return 4

  if (request.quizAnswers?.tripStyle === "solo") return 1
  if (request.quizAnswers?.tripStyle === "romantica") return 2
  if (request.quizAnswers?.tripStyle === "familia") return 3

  const text = normalizeText(request.inputText)
  const explicit = text.match(/(\d{1,2})\s+(pessoas|adultos|viajantes)/)
  if (explicit) return Math.max(1, Number.parseInt(explicit[1], 10))
  if (text.includes("casal") || text.includes("dupla")) return 2
  if (text.includes("familia")) return 3
  if (text.includes("sozinho") || text.includes("solo")) return 1
  return 2
}

function resolveDurationDays(request: TripGenerationInput) {
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
  return 5
}

function inferMonth(request: TripGenerationInput) {
  const text = normalizeText(request.inputText)
  const monthIndex = MONTHS_PT.findIndex((month) => text.includes(month))
  if (monthIndex >= 0) return monthIndex + 1

  if (request.quizAnswers?.vibe === "inverno") return 7
  if (request.quizAnswers?.vibe === "verao" || request.quizAnswers?.vibe === "praia") return 1
  return undefined
}

function inferBudgetLevel(request: TripGenerationInput) {
  switch (request.profile?.priceSensitivity) {
    case "economico":
      return "low" as const
    case "premium":
      return "high" as const
    case "intermediario":
      return "medium" as const
  }

  switch (request.quizAnswers?.budget) {
    case "ate-3000":
      return "low" as const
    case "ate-5000":
    case "ate-8000":
      return "medium" as const
    case "acima-8000":
      return "high" as const
  }

  const text = normalizeText(request.inputText)
  if (text.includes("luxo") || text.includes("premium") || text.includes("resort")) return "high" as const
  if (text.includes("econom") || text.includes("barato") || text.includes("baixo custo")) return "low" as const
  return "medium" as const
}

function inferTravelStyle(request: TripGenerationInput) {
  switch (request.profile?.style) {
    case "casal":
      return "romantica"
    case "relaxamento":
      return "descanso"
    default:
      break
  }

  if (request.profile?.style) {
    return request.profile.style
  }

  return request.quizAnswers?.tripStyle ?? "geral"
}

function inferPace(request: TripGenerationInput, durationDays: number) {
  switch (request.profile?.pace) {
    case "tranquilo":
      return "light" as const
    case "intenso":
      return "intense" as const
    case "equilibrado":
      return "balanced" as const
  }

  const text = normalizeText(request.inputText)
  if (text.includes("sem correria") || text.includes("tranquilo") || text.includes("descanso")) return "light" as const
  if (text.includes("aproveitar tudo") || text.includes("intenso") || durationDays <= 3) return "intense" as const
  return "balanced" as const
}

function inferOrigin(request: TripGenerationInput) {
  const text = normalizeText(request.inputText)
  const originMatch = text.match(/saindo de ([a-z\s]+)/)
  return originMatch?.[1]?.trim() || "brasil"
}

function inferDestinationRegion(destination: string, request: TripGenerationInput) {
  const normalizedDestination = normalizeText(destination)

  if (
    ["rio de janeiro", "gramado", "florianopolis", "fernando de noronha"].some((hint) => normalizedDestination.includes(hint))
  ) {
    return "brasil"
  }

  if (["bariloche", "buenos aires", "santiago"].some((hint) => normalizedDestination.includes(hint))) {
    return "america do sul"
  }

  if (["lisboa", "paris", "portugal", "franca", "europa"].some((hint) => normalizedDestination.includes(hint))) {
    return "europa"
  }

  if (["orlando", "estados unidos", "miami", "nova york"].some((hint) => normalizedDestination.includes(hint))) {
    return "america do norte"
  }

  return request.quizAnswers?.region === "internacional" ? "europa" : "brasil"
}

function buildFallbackDestinationData(destination: string, request: TripGenerationInput): TravelKnowledgeMatch {
  const regionKey = inferDestinationRegion(destination, request)
  const fallback = travelRegionFallbacks[regionKey] ?? travelRegionFallbacks.brasil

  return {
    usedFallback: true,
    dataConfidence: fallback.dataConfidence,
    destinationData: {
      ...fallback,
      destination,
      country: fallback.country,
    },
  }
}

export function findDestinationKnowledge(destination: string, request: TripGenerationInput): TravelKnowledgeMatch {
  const normalizedDestination = normalizeText(destination)
  const exact = travelKnowledgeBase.find((entry) => normalizeText(entry.destination) === normalizedDestination)

  if (exact) {
    return {
      destinationData: exact,
      dataConfidence: "high",
      usedFallback: false,
    }
  }

  const partial = travelKnowledgeBase.find(
    (entry) =>
      normalizedDestination.includes(normalizeText(entry.destination)) ||
      normalizeText(entry.destination).includes(normalizedDestination),
  )

  if (partial) {
    return {
      destinationData: partial,
      dataConfidence: "medium",
      usedFallback: false,
    }
  }

  return buildFallbackDestinationData(destination, request)
}

export function buildUserTravelProfile(request: TripGenerationInput, destination?: string): UserTravelProfile {
  const durationDays = resolveDurationDays(request)
  const normalizedProfile = sanitizeTripProfileInput(request.profile)
  const profile = resolveTripProfileFallback(request.profile)
  const profileRequest = normalizedProfile
    ? {
        ...request,
        profile: normalizedProfile,
      }
    : undefined
  const travelStyle = profileRequest ? inferTravelStyle(profileRequest) : defaultTripProfile.style
  const text = normalizeText(request.inputText)
  const vibe = request.quizAnswers?.vibe
  const preferences = new Set(profile.preferences)
  const flightPreference = profile.flightPreference

  return {
    budgetLevel: profileRequest ? inferBudgetLevel(profileRequest) : "medium",
    travelStyle,
    pace: profileRequest ? inferPace(profileRequest, durationDays) : "balanced",
    prefersNature:
      preferences.has("natureza") || vibe === "natureza" || text.includes("natureza") || text.includes("trilha") || travelStyle === "aventura",
    prefersCulture:
      preferences.has("cultura") || vibe === "cultura" || text.includes("cultura") || text.includes("museu") || travelStyle === "cultural",
    prefersBeach: preferences.has("praia") || vibe === "praia" || vibe === "verao" || text.includes("praia") || text.includes("mar"),
    prefersSnow: preferences.has("neve-frio") || vibe === "inverno" || text.includes("neve") || text.includes("frio") || text.includes("esqui"),
    prefersFood: preferences.has("gastronomia") || text.includes("gastronomia") || text.includes("restaurante"),
    prefersNightlife: preferences.has("vida-noturna") || text.includes("vida noturna") || text.includes("balada"),
    prefersShopping: preferences.has("compras") || text.includes("compras") || text.includes("outlet"),
    prefersParks: preferences.has("parques-atracoes") || text.includes("parques") || text.includes("atracoes"),
    prefersLuxury:
      profile.style === "luxo" ||
      profile.priceSensitivity === "premium" ||
      vibe === "luxo" ||
      travelStyle === "luxo" ||
      text.includes("luxo") ||
      text.includes("premium"),
    dislikesLongFlights: flightPreference === "voos-curtos" || text.includes("voo curto") || text.includes("sem voo longo") || durationDays <= 4,
    avoidsConnections: flightPreference === "evitar-conexoes",
    acceptsConnections: flightPreference === "aceito-conexoes",
    travelers: inferTravelers(request),
    durationDays,
    origin: inferOrigin(request),
    destination,
    month: inferMonth(request),
  }
}

function budgetDailyTarget(profile: UserTravelProfile) {
  if (profile.budgetLevel === "low") return 350
  if (profile.budgetLevel === "high") return 1300
  return 700
}

function selectLodgingTier(profile: UserTravelProfile) {
  if (profile.prefersLuxury || profile.budgetLevel === "high") return "premium" as const
  if (profile.budgetLevel === "low") return "economico" as const
  return "intermediario" as const
}

function estimateTripCost(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const lodgingTier = selectLodgingTier(userProfile)
  const people = Math.max(1, userProfile.travelers)
  const flightKey = destinationData.region === "Brasil" ? "domesticOrigin" : "internationalOrigin"
  const baseCosts = {
    flights: destinationData.estimatedFlightCostBRL[flightKey] * people,
    lodging: destinationData.lodgingDailyBRL[lodgingTier] * userProfile.durationDays,
    food:
      (userProfile.budgetLevel === "low"
        ? destinationData.foodDailyBRL.economico
        : userProfile.budgetLevel === "high"
          ? destinationData.foodDailyBRL.premium
          : destinationData.foodDailyBRL.intermediario) *
      userProfile.durationDays *
      people,
    localTransport: destinationData.localTransportDailyBRL * userProfile.durationDays * people,
    activities: 0,
  }

  const seasonalized = applySeasonalityMultiplier(baseCosts, userProfile.month ?? new Date().getMonth() + 1, destinationData)

  return {
    total: seasonalized.totalCost,
    flightCost: seasonalized.breakdown.flights,
    lodging: seasonalized.breakdown.lodging,
    food: seasonalized.breakdown.food,
    localTransport: seasonalized.breakdown.localTransport,
    multiplier: seasonalized.multiplier,
  }
}

function calculateTripStyleScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const signals: number[] = []

  switch (userProfile.travelStyle) {
    case "romantica":
      signals.push(destinationData.romanticScore)
      break
    case "familia":
      signals.push(destinationData.familyScore)
      break
    case "aventura":
      signals.push(destinationData.adventureScore, destinationData.natureScore)
      break
    case "cultural":
      signals.push(destinationData.cultureScore, destinationData.foodScore)
      break
    case "luxo":
      signals.push(destinationData.foodScore, destinationData.romanticScore, destinationData.safetyScore)
      break
    case "descanso":
      signals.push(destinationData.natureScore, destinationData.walkabilityScore)
      break
    default:
      signals.push(destinationData.foodScore, destinationData.cultureScore, destinationData.natureScore)
  }

  if (userProfile.prefersBeach && destinationData.tags.includes("praia")) signals.push(92)
  if (userProfile.prefersSnow && destinationData.tags.includes("neve")) signals.push(96)
  if (userProfile.prefersNature) signals.push(destinationData.natureScore)
  if (userProfile.prefersCulture) signals.push(destinationData.cultureScore)
  if (userProfile.prefersFood) signals.push(destinationData.foodScore)
  if (userProfile.prefersNightlife) signals.push(destinationData.nightlifeScore)
  if (userProfile.prefersShopping) signals.push(destinationData.walkabilityScore, destinationData.mobilityScore)
  if (userProfile.prefersParks) signals.push(destinationData.familyScore, destinationData.adventureScore)
  if (userProfile.prefersLuxury) signals.push(destinationData.foodScore, destinationData.safetyScore)

  return clampScore(average(signals))
}

export function calculateAffordabilityScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const estimated = estimateTripCost(destinationData, userProfile)
  const dailyTarget = budgetDailyTarget(userProfile)
  const totalTarget = dailyTarget * userProfile.durationDays * Math.max(1, userProfile.travelers)
  const relative = estimated.total / Math.max(1, totalTarget)
  return clampScore(120 - relative * 50)
}

export function calculateClimateComfortScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const month = userProfile.month
  if (!month) return 70

  const climate = destinationData.climateByMonth[month]
  if (!climate) return 70

  let score = climate.comfortScore

  if (userProfile.prefersSnow) {
    score += (climate.snowProbability ?? 0) * 0.15
    if ((climate.snowProbability ?? 0) < 20) score -= 18
  }

  if (userProfile.prefersBeach) {
    if (climate.avgTemp >= 24 && climate.avgTemp <= 31) score += 10
    if (climate.rainProbability > 45) score -= 15
  }

  if (!userProfile.prefersSnow && climate.avgTemp < 8) score -= 12
  if (climate.rainProbability > 55) score -= 12

  return clampScore(score)
}

function calculateSeasonScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const month = userProfile.month
  if (!month) return 65
  if (destinationData.lowSeasonMonths.includes(month)) return 88
  if (destinationData.highSeasonMonths.includes(month)) return userProfile.prefersSnow ? 82 : 58
  return 72
}

export function calculateExperienceScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const weighted = average([
    destinationData.foodScore,
    destinationData.natureScore,
    destinationData.cultureScore,
    destinationData.mobilityScore,
    destinationData.safetyScore,
    userProfile.prefersNightlife ? destinationData.nightlifeScore : destinationData.walkabilityScore,
    calculateTripStyleScore(destinationData, userProfile),
  ])

  return clampScore(weighted)
}

export function calculateOvercrowdingIndex(destinationData: TravelDestinationData, userProfile: UserTravelProfile): OvercrowdingInsight {
  const baseCrowd = userProfile.month ? destinationData.crowdIndexByMonth[userProfile.month] : undefined
  const score = clampScore(baseCrowd ?? average(Object.values(destinationData.crowdIndexByMonth)))
  const label: OvercrowdingLabel = score <= 30 ? "tranquilo" : score <= 70 ? "moderado" : "muito cheio"
  return { score, label }
}

export function calculateRouteComfortScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const flightKey = destinationData.region === "Brasil" ? "domesticOrigin" : "internationalOrigin"
  const flightHours = destinationData.estimatedFlightDurationHours?.[flightKey] ?? (destinationData.region === "Brasil" ? 2.5 : 9)
  let score = average([destinationData.mobilityScore, destinationData.walkabilityScore, 90 - flightHours * 6])

  if (userProfile.dislikesLongFlights && flightHours > 5) {
    score -= 18
  }

  if (userProfile.avoidsConnections && flightHours > 6) {
    score -= 10
  }

  if (userProfile.acceptsConnections && flightHours > 6) {
    score += 4
  }

  if (userProfile.durationDays <= 4 && flightHours > 8) {
    score -= 12
  }

  return clampScore(score)
}

export function calculateSmartTimingScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile): SmartTimingInsight {
  const seasonScore = calculateSeasonScore(destinationData, userProfile)
  const affordabilityScore = calculateAffordabilityScore(destinationData, userProfile)
  const overcrowding = calculateOvercrowdingIndex(destinationData, userProfile).score
  const score = clampScore(seasonScore * 0.4 + affordabilityScore * 0.3 + (100 - overcrowding) * 0.3)

  const label: SmartTimingLabel =
    score >= 76 ? "Boa janela de compra" : score >= 51 ? "Preço razoável" : "Pode estar mais caro que o normal"

  return { score, label }
}

export function calculateDestinationMatchScore(destinationData: TravelDestinationData, userProfile: UserTravelProfile) {
  const budgetScore = calculateAffordabilityScore(destinationData, userProfile)
  const climateScore = calculateClimateComfortScore(destinationData, userProfile)
  const tripStyleScore = calculateTripStyleScore(destinationData, userProfile)
  const seasonScore = calculateSeasonScore(destinationData, userProfile)
  const experienceScore = calculateExperienceScore(destinationData, userProfile)
  const safetyScore = destinationData.safetyScore
  const routeComfortScore = calculateRouteComfortScore(destinationData, userProfile)

  return clampScore(
    budgetScore * 0.3 +
      climateScore * 0.15 +
      tripStyleScore * 0.2 +
      seasonScore * 0.1 +
      experienceScore * 0.1 +
      safetyScore * 0.1 +
      routeComfortScore * 0.05,
  )
}

export function generateTravelExplanation(
  scores: ScoreBreakdown,
  destinationData: TravelDestinationData,
  userProfile: UserTravelProfile,
): TravelExplanation {
  const reasons: string[] = []
  const warnings: string[] = []
  const monthLabel = userProfile.month ? MONTHS_PT[userProfile.month - 1] : "o período informado"
  const climate = userProfile.month ? destinationData.climateByMonth[userProfile.month] : undefined
  const seasonalityMultiplier = userProfile.month ? getSeasonalityMultiplier(destinationData, userProfile.month) : 1
  const seasonalityMessage = getSeasonalityPriceMessage(seasonalityMultiplier)

  reasons.push(
    `${destinationData.destination} combina com o perfil informado por equilibrar ${destinationData.tags.slice(0, 3).join(", ")}.`,
  )

  if (userProfile.prefersSnow && (climate?.snowProbability ?? 0) > 40) {
    reasons.push(`${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} aumenta a chance de neve e reforça a experiência de inverno.`)
  } else if (userProfile.prefersBeach && climate) {
    reasons.push(
      `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} tende a entregar clima favorável para praia, com conforto estimado de ${scores.climateComfortScore}/100.`,
    )
  }

  if (scores.affordabilityScore >= 70) {
    reasons.push("O custo estimado fica relativamente bem alinhado ao orçamento interpretado para a viagem.")
  } else {
    reasons.push("A experiência tende a ser boa, mas o orçamento precisa absorver custos de passagem, hospedagem e alimentação acima da média.")
  }

  if (seasonalityMultiplier > 1.2) {
    warnings.push(seasonalityMessage)
  } else {
    reasons.push(seasonalityMessage)
  }

  if (scores.overcrowdingIndex.label === "muito cheio") {
    warnings.push(`${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} costuma ter maior lotação turística nesse destino.`)
  }

  if (scores.climateComfortScore < 60) {
    warnings.push("O clima estimado para o período pode reduzir o conforto da viagem.")
  }

  if (scores.smartTimingScore.score < 55) {
    warnings.push("Os preços podem estar pressionados pelo período ou pela procura sazonal.")
  }

  warnings.push("Os valores são estimativas e podem variar conforme antecedência, câmbio e disponibilidade.")

  const strongestCandidates = [
    { label: "natureza", score: destinationData.natureScore },
    { label: "gastronomia", score: destinationData.foodScore },
    { label: "cultura", score: destinationData.cultureScore },
    { label: "estrutura urbana", score: average([destinationData.mobilityScore, destinationData.walkabilityScore]) },
  ].sort((left, right) => right.score - left.score)

  const attentionCandidates = [
    { label: "custo", score: 100 - scores.affordabilityScore },
    { label: "lotação", score: scores.overcrowdingIndex.score },
    { label: "clima", score: 100 - scores.climateComfortScore },
    { label: "deslocamento", score: 100 - scores.routeComfortScore },
  ].sort((left, right) => right.score - left.score)

  return {
    summary: `${destinationData.destination} combina ${scores.destinationMatchScore >= 75 ? "bem" : "de forma razoável"} com o perfil informado por unir ${destinationData.tags.slice(0, 3).join(", ")} e boa aderência ao estilo da viagem.`,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 4),
    strongestPoint: `O principal ponto forte é ${strongestCandidates[0]?.label ?? "a experiência geral"} do destino.`,
    attentionPoint: `O principal ponto de atenção é ${attentionCandidates[0]?.label ?? "a previsibilidade do custo"} neste cenário.`,
  }
}

export function buildTripIntelligence(destination: string, request: TripGenerationInput): {
  intelligence: TripIntelligence
  destinationData: TravelDestinationData
  userProfile: UserTravelProfile
  usedFallback: boolean
} {
  const knowledgeMatch = findDestinationKnowledge(destination, request)
  const rawUserProfile = buildUserTravelProfile(request, destination)
  const destinationData = knowledgeMatch.destinationData
  const resolvedPeriod = resolveTripPeriod(request, destinationData, rawUserProfile)
  const resolvedMonth = getTripMonth({
    startDate: resolvedPeriod.startDate,
    periodLabel: resolvedPeriod.periodLabel,
    isSuggestedPeriod: resolvedPeriod.isSuggestedPeriod,
  })
  const userProfile: UserTravelProfile = {
    ...rawUserProfile,
    month: resolvedMonth,
    durationDays: resolvedPeriod.durationDays || rawUserProfile.durationDays,
  }

  const affordabilityScore = calculateAffordabilityScore(destinationData, userProfile)
  const climateComfortScore = calculateClimateComfortScore(destinationData, userProfile)
  const experienceScore = calculateExperienceScore(destinationData, userProfile)
  const overcrowdingIndex = calculateOvercrowdingIndex(destinationData, userProfile)
  const routeComfortScore = calculateRouteComfortScore(destinationData, userProfile)
  const smartTimingScore = calculateSmartTimingScore(destinationData, userProfile)
  const destinationMatchScore = calculateDestinationMatchScore(destinationData, userProfile)

  const scores: ScoreBreakdown = {
    destinationMatchScore,
    affordabilityScore,
    smartTimingScore,
    experienceScore,
    climateComfortScore,
    overcrowdingIndex,
    routeComfortScore,
  }

  return {
    destinationData,
    userProfile,
    usedFallback: knowledgeMatch.usedFallback,
    intelligence: {
      ...scores,
      explanation: generateTravelExplanation(scores, destinationData, userProfile),
      dataConfidence: knowledgeMatch.dataConfidence,
    },
  }
}
