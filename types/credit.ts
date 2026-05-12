export type CreditTransactionType =
  | "bonus_signup"
  | "purchase"
  | "trip_generation"
  | "full_itinerary"
  | "trip_adjustment"
  | "destination_comparison"
  | "detailed_budget"
  | "refund"
  | "system"

export type CreditPackage = {
  id: "pack_5" | "pack_15" | "pack_30"
  credits: number
  price: string
  highlight?: string
}

export type CreditTransactionEntry = {
  id: string
  userId: string
  email: string | null
  type: CreditTransactionType
  credits: number
  description: string | null
  paymentId: string | null
  createdAt: string
}

export type CreditHistorySummary = {
  currentBalance: number
  totalGained: number
  totalSpent: number
  countsByType: Partial<Record<CreditTransactionType, number>>
  transactions: CreditTransactionEntry[]
}
