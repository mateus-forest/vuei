export type SupportTicketCategory =
  | "credits_not_received"
  | "credit_consumed_error"
  | "simulation_not_generated"
  | "download_issue"
  | "itinerary_issue"
  | "payment_refund"
  | "other"

export type SupportTicketStatus = "open" | "in_review" | "resolved" | "canceled"

export type SupportTicketPriority = "low" | "normal" | "high"

export type SupportTicket = {
  id: string
  userId: string | null
  email: string | null
  category: SupportTicketCategory
  subject: string | null
  message: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  relatedSearchId: string | null
  relatedPaymentId: string | null
  adminNote: string | null
  customerMessage: string | null
  customerMessageAt: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}
