import type { TripOrigin, TripResult } from "@/types/trip"

export type Search = {
  id: string
  userId: string
  origin: TripOrigin
  input: string
  destination: string
  estimatedCost: string
  shortItinerary: string[]
  fullItinerary: string[]
  tips: string[]
  createdAt: string
  result: TripResult
}
