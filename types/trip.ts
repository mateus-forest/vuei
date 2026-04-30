export type TripOrigin = "busca" | "quiz" | "sugestao"

export type TripCostBreakdown = {
  flights: number
  lodging: number
  food: number
  localTransport: number
  activities: number
}

export type TripVariant = {
  type: "economic" | "intermediate" | "premium"
  title: string
  totalCost: number
  costPerPerson: number
  breakdown: TripCostBreakdown
  assumptions: string
  itinerary: string[]
}

export type TripResult = {
  destination: string
  estimatedCost: string
  bestFor: string
  summary: string
  periodLabel?: string
  startDate?: string
  endDate?: string
  durationDays?: number
  durationLabel?: string
  travelers?: number
  currency?: "BRL"
  variants?: TripVariant[]
  itinerary: string[]
  fullItinerary?: string[]
  tips: string[]
  context: string
  cheapestAlternative?: string
}

export type QuizAnswer = {
  tripStyle: "solo" | "romantica" | "familia" | "aventura" | "descanso" | "luxo" | "cultural"
  budget: "ate-3000" | "ate-5000" | "ate-8000" | "acima-8000"
  duration: "fim-de-semana" | "4-6-dias" | "7-10-dias" | "11+-dias"
  region: "brasil" | "internacional"
  vibe: "praia" | "inverno" | "verao" | "cultura" | "natureza" | "luxo"
}

export type TripGenerationInput = {
  origin: TripOrigin
  inputText?: string
  quizAnswers?: QuizAnswer
  userId?: string
}

export type TripGenerationOutput = TripResult

export type TripGenerationResponse = {
  success: boolean
  fallbackUsed: boolean
  request: TripGenerationInput
  result: TripGenerationOutput
}
