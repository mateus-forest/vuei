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
  type:
    | "bonus_signup"
    | "purchase"
    | "trip_generation"
    | "full_itinerary"
    | "trip_adjustment"
    | "destination_comparison"
    | "detailed_budget"
    | "refund"
    | "system"
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
  credits_applied: boolean
  created_at: string
}

export type SupportTicketRow = {
  id: string
  user_id: string | null
  email: string | null
  category:
    | "credits_not_received"
    | "credit_consumed_error"
    | "simulation_not_generated"
    | "download_issue"
    | "itinerary_issue"
    | "payment_refund"
    | "other"
  subject: string | null
  message: string
  status: "open" | "in_review" | "resolved" | "canceled"
  priority: "low" | "normal" | "high"
  related_search_id: string | null
  related_payment_id: string | null
  admin_note: string | null
  customer_message: string | null
  customer_message_at: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}
