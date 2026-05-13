import type { SupportTicketRow } from "@/types/database"
import type { SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@/types/support"

export const supportTicketCategories = [
  "credits_not_received",
  "credit_consumed_error",
  "simulation_not_generated",
  "download_issue",
  "itinerary_issue",
  "payment_refund",
  "other",
] as const satisfies readonly SupportTicketCategory[]

export const supportTicketStatuses = ["open", "in_review", "resolved", "canceled"] as const satisfies readonly SupportTicketStatus[]

export const supportTicketPriorities = ["low", "normal", "high"] as const satisfies readonly SupportTicketPriority[]

export function mapSupportTicketRow(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    priority: row.priority,
    relatedSearchId: row.related_search_id,
    relatedPaymentId: row.related_payment_id,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  }
}
