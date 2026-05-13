import type { SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@/types/support"

const categoryLabels: Record<SupportTicketCategory, string> = {
  credits_not_received: "Créditos não recebidos",
  credit_consumed_error: "Crédito consumido com erro",
  simulation_not_generated: "Simulação não gerada",
  download_issue: "Problema ao baixar roteiro",
  itinerary_issue: "Problema no roteiro",
  payment_refund: "Pagamento ou reembolso",
  other: "Outro",
}

const statusLabels: Record<SupportTicketStatus, string> = {
  open: "Aberto",
  in_review: "Em análise",
  resolved: "Resolvido",
  canceled: "Cancelado",
}

const priorityLabels: Record<SupportTicketPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
}

export function getSupportTicketCategoryLabel(category: SupportTicketCategory) {
  return categoryLabels[category]
}

export function getSupportTicketStatusLabel(status: SupportTicketStatus) {
  return statusLabels[status]
}

export function getSupportTicketPriorityLabel(priority: SupportTicketPriority) {
  return priorityLabels[priority]
}

export function summarizeSupportTicketMessage(ticket: Pick<SupportTicket, "message">, maxLength = 120) {
  const message = ticket.message.trim().replace(/\s+/g, " ")

  if (message.length <= maxLength) {
    return message
  }

  return `${message.slice(0, maxLength - 1)}…`
}
