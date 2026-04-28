import type { Search } from "@/types/search"
import { defaultTripResult, quizResultMap, tripCatalog } from "@/lib/mocks/trips"

function buildSearchRecord({
  id,
  userId,
  origin,
  input,
  createdAt,
  result,
}: {
  id: string
  userId: string
  origin: Search["origin"]
  input: string
  createdAt: string
  result: Search["result"]
}): Search {
  return {
    id,
    userId,
    origin,
    input,
    destination: result.destination,
    estimatedCost: result.estimatedCost,
    shortItinerary: result.itinerary,
    fullItinerary: result.fullItinerary ?? result.itinerary,
    tips: result.tips,
    createdAt,
    result,
  }
}

export const mockTravelHistory: Search[] = [
  buildSearchRecord({
    id: "trip_1",
    userId: "usr_1",
    origin: "busca",
    input: "Quero viajar para Europa com 5 mil reais",
    createdAt: "2026-04-22T15:30:00.000Z",
    result: defaultTripResult,
  }),
  buildSearchRecord({
    id: "trip_2",
    userId: "usr_1",
    origin: "sugestao",
    input: "Destino de praia no Brasil para 4 dias",
    createdAt: "2026-04-22T18:00:00.000Z",
    result: tripCatalog[0].result,
  }),
  buildSearchRecord({
    id: "trip_3",
    userId: "usr_1",
    origin: "quiz",
    input: "Quiz natureza e aventura",
    createdAt: "2026-04-23T08:20:00.000Z",
    result: quizResultMap.natureza,
  }),
]
