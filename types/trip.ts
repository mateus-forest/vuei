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

export type TripDataConfidence = "high" | "medium" | "low"

export type OvercrowdingLabel = "tranquilo" | "moderado" | "muito cheio"

export type SmartTimingLabel = "Boa janela de compra" | "Preço razoável" | "Pode estar mais caro que o normal"

export type TravelExplanation = {
  summary: string
  reasons: string[]
  warnings: string[]
  strongestPoint: string
  attentionPoint: string
}

export type OvercrowdingInsight = {
  score: number
  label: OvercrowdingLabel
}

export type SmartTimingInsight = {
  score: number
  label: SmartTimingLabel
}

export type TripIntelligence = {
  destinationMatchScore: number
  affordabilityScore: number
  smartTimingScore: SmartTimingInsight
  experienceScore: number
  climateComfortScore: number
  overcrowdingIndex: OvercrowdingInsight
  routeComfortScore: number
  explanation: TravelExplanation
  dataConfidence: TripDataConfidence
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
  isSuggestedPeriod?: boolean
  periodReason?: string
  travelers?: number
  currency?: "BRL"
  variants?: TripVariant[]
  itinerary: string[]
  fullItinerary?: string[]
  tips: string[]
  context: string
  cheapestAlternative?: string
  intelligence?: TripIntelligence
}

export type QuizAnswer = {
  tripStyle: "solo" | "romantica" | "familia" | "aventura" | "descanso" | "luxo" | "cultural"
  budget: "ate-3000" | "ate-5000" | "ate-8000" | "acima-8000"
  duration: "fim-de-semana" | "4-6-dias" | "7-10-dias" | "11+-dias"
  region: "brasil" | "internacional"
  vibe: "praia" | "inverno" | "verao" | "cultura" | "natureza" | "luxo"
}

export type TripProfileStyle = "familia" | "casal" | "amigos" | "solo" | "trabalho" | "luxo" | "aventura" | "relaxamento"

export type TripProfilePace = "tranquilo" | "equilibrado" | "intenso"

export type TripProfilePreference =
  | "praia"
  | "natureza"
  | "cultura"
  | "gastronomia"
  | "vida-noturna"
  | "neve-frio"
  | "compras"
  | "parques-atracoes"

export type TripProfilePriceSensitivity = "economico" | "intermediario" | "premium"

export type TripProfileFlightPreference = "voos-curtos" | "aceito-conexoes" | "evitar-conexoes" | "nao-importa"

export type TripProfileInput = {
  style?: TripProfileStyle
  pace?: TripProfilePace
  preferences?: TripProfilePreference[]
  priceSensitivity?: TripProfilePriceSensitivity
  flightPreference?: TripProfileFlightPreference
}

export type TripGenerationInput = {
  origin: TripOrigin
  inputText?: string
  quizAnswers?: QuizAnswer
  profile?: TripProfileInput
  userId?: string
}

export type TripGenerationOutput = TripResult

export type TripGenerationResponse = {
  success: boolean
  fallbackUsed: boolean
  request: TripGenerationInput
  result: TripGenerationOutput
}
