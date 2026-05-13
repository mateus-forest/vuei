import type { CreditTransactionEntry, CreditTransactionType } from "@/types/credit"

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function stripUuid(value: string) {
  return value.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "").trim()
}

function cleanDestination(destination?: string | null) {
  if (!destination) {
    return ""
  }

  return normalizeWhitespace(stripUuid(destination).replace(/^[-:—–\s]+|[-:—–\s]+$/g, ""))
}

export function getCreditTransactionLabel(type: CreditTransactionType) {
  switch (type) {
    case "bonus_signup":
      return "Crédito bônus de cadastro"
    case "purchase":
      return "Créditos adicionados"
    case "trip_generation":
      return "Nova viagem gerada"
    case "full_itinerary":
      return "Roteiro completo gerado"
    case "trip_adjustment":
      return "Viagem ajustada"
    case "destination_comparison":
      return "Comparação de destino"
    case "detailed_budget":
      return "Orçamento detalhado"
    case "refund":
      return "Crédito estornado"
    case "system":
      return "Ajuste de créditos"
    default:
      return "Movimentação de créditos"
  }
}

export function buildCreditTransactionDescription({
  type,
  destination,
}: {
  type: CreditTransactionType
  destination?: string | null
}) {
  const label = getCreditTransactionLabel(type)
  const safeDestination = cleanDestination(destination)
  return safeDestination ? `${label} — ${safeDestination}` : label
}

export function isTechnicalCreditDescription(description: string, type: CreditTransactionType) {
  const normalized = description.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  if (normalized.includes("00000000-0000-0000-0000-000000000000")) {
    return true
  }

  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  if (uuidPattern.test(description)) {
    return true
  }

  return normalized.startsWith(`${type}:`)
}

export function getCreditTransactionTitle(transaction: CreditTransactionEntry) {
  const label = getCreditTransactionLabel(transaction.type)
  const description = transaction.description?.trim() ?? ""

  if (!description || isTechnicalCreditDescription(description, transaction.type)) {
    return label
  }

  const withoutUuid = normalizeWhitespace(stripUuid(description))
  return withoutUuid || label
}

export function getCreditTransactionUsagePrefix(transaction: CreditTransactionEntry) {
  return transaction.credits > 0 ? "Entrada de crédito" : "Uso de crédito"
}
