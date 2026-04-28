export type ProfileRow = {
  id: string
  name?: string | null
  full_name?: string | null
  email: string
  phone: string | null
  credits: number
  role: "user" | "admin"
  status?: "active" | "blocked" | null
  free_search_used: boolean
  plan_label: string
  joined_at: string
  created_at?: string
  updated_at?: string
}

export type TripRow = {
  id: string
  user_id: string
  origin: "busca" | "quiz" | "sugestao"
  input_original: string
  destination: string
  estimated_cost: string
  summary: string
  best_for: string
  itinerary_summary: unknown
  itinerary_full: unknown
  tips: unknown
  created_at: string
}

export type SearchRow = {
  id: string
  user_id: string | null
  email: string | null
  source: "landing" | "dashboard" | "quiz"
  prompt: string
  result: unknown
  credits_used: number
  created_at: string
}

export type CreditTransactionRow = {
  id: string
  user_id: string
  email: string | null
  type: "purchase" | "usage" | "manual"
  credits: number
  description: string | null
  payment_id: string | null
  created_at: string
}

export type PaymentRow = {
  id: string
  user_id: string | null
  email: string | null
  stripe_session_id: string
  stripe_payment_intent: string | null
  amount_cents: number
  currency: string
  status: string | null
  plan: string | null
  credits: number
  created_at: string
}
