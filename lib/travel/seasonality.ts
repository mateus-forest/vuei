import type { TravelDestinationData } from "@/lib/travel/travelKnowledgeBase"
import type { TripCostBreakdown } from "@/types/trip"

type SeasonalCostBreakdown = {
  flights: number
  lodging: number
  food: number
  localTransport: number
  activities: number
}

function roundCost(value: number) {
  return Math.max(0, Math.round(value))
}

export function getFallbackSeasonalityMultiplierByMonth(destinationData: TravelDestinationData): Record<number, number> {
  return Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const multiplier = destinationData.highSeasonMonths.includes(month)
        ? 1.3
        : destinationData.lowSeasonMonths.includes(month)
          ? 0.9
          : 1

      return [month, multiplier]
    }),
  ) as Record<number, number>
}

export function getSeasonalityMultiplierByMonth(destinationData: TravelDestinationData): Record<number, number> {
  const fallback = getFallbackSeasonalityMultiplierByMonth(destinationData)

  return Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const multiplier = destinationData.seasonalityMultiplierByMonth?.[month]
      return [month, typeof multiplier === "number" && Number.isFinite(multiplier) ? multiplier : fallback[month]]
    }),
  ) as Record<number, number>
}

export function getSeasonalityMultiplier(destinationData: TravelDestinationData, month: number) {
  const multipliers = getSeasonalityMultiplierByMonth(destinationData)
  return multipliers[month] ?? 1
}

export function applySeasonalityMultiplier(
  costs: SeasonalCostBreakdown,
  month: number,
  destinationData: TravelDestinationData,
) {
  const multiplier = getSeasonalityMultiplier(destinationData, month)

  const adjusted = {
    flights: roundCost(costs.flights * Math.min(1.5, multiplier)),
    lodging: roundCost(costs.lodging * Math.min(1.45, multiplier * 0.9 + 0.1)),
    food: roundCost(costs.food * (multiplier * 0.3 + 0.7)),
    localTransport: roundCost(costs.localTransport * (multiplier * 0.2 + 0.8)),
    activities: roundCost(costs.activities * (multiplier * 0.35 + 0.65)),
  }

  return {
    multiplier,
    breakdown: adjusted,
    totalCost: adjusted.flights + adjusted.lodging + adjusted.food + adjusted.localTransport + adjusted.activities,
  }
}

export function getSeasonalityPriceMessage(multiplier: number) {
  if (multiplier > 1.2) {
    return "Os preços estão mais altos devido à alta temporada no período selecionado."
  }

  if (multiplier < 0.9) {
    return "Os preços estão mais acessíveis por ser um período de menor demanda."
  }

  return "Os preços estão dentro da média para o período."
}

export function scaleBreakdownToTotal(breakdown: TripCostBreakdown, targetTotal: number): TripCostBreakdown {
  const currentTotal = breakdown.flights + breakdown.lodging + breakdown.food + breakdown.localTransport + breakdown.activities
  if (currentTotal <= 0) return breakdown

  const ratio = targetTotal / currentTotal
  const scaled: TripCostBreakdown = {
    flights: roundCost(breakdown.flights * ratio),
    lodging: roundCost(breakdown.lodging * ratio),
    food: roundCost(breakdown.food * ratio),
    localTransport: roundCost(breakdown.localTransport * ratio),
    activities: roundCost(breakdown.activities * ratio),
  }

  const difference = targetTotal - (scaled.flights + scaled.lodging + scaled.food + scaled.localTransport + scaled.activities)
  scaled.lodging += difference
  return scaled
}
