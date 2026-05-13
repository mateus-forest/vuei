import type { CreditTransactionRow, PaymentRow, ProfileRow, SearchRow, SupportTicketRow } from "@/types/database"
import type { Search } from "@/types/search"
import type { SupportTicket } from "@/types/support"
import type { User } from "@/types/user"
import type { TripItineraryDay, TripResult } from "@/types/trip"
import { mapSupportTicketRow } from "@/lib/services/support-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type AdminPurchase = {
  id: string
  user: string
  email: string | null
  plan: string | null
  packLabel: string
  credits: number
  value: string
  amountCents: number
  date: string
  status: string
}

export type AdminFinanceData = {
  paymentsCount: number
  soldCredits: number
  estimatedRevenueCents: number
  recentPurchases: AdminPurchase[]
}

export type AdminSupportData = {
  openCount: number
  inReviewCount: number
  resolvedCount: number
  recentTickets: SupportTicket[]
}

type AdminPanelData = {
  users: User[]
  searches: Search[]
  creditTransactions: CreditTransactionRow[]
  purchases: AdminPurchase[]
  finance: AdminFinanceData
  support: AdminSupportData
}

function logAdminQueryError(
  table: "profiles" | "searches" | "credit_transactions" | "payments" | "support_tickets",
  error: { message?: string; code?: string; details?: string | null; hint?: string | null } | null | undefined,
) {
  console.error("ADMIN QUERY ERROR", {
    table,
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  })
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asDetailedItinerary(value: unknown): TripItineraryDay[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item, index) => {
    if (typeof item !== "object" || item === null) {
      return []
    }

    const day = item as Record<string, unknown>
    return [
      {
        day: typeof day.day === "number" ? day.day : index + 1,
        title: typeof day.title === "string" ? day.title : `Dia ${index + 1}`,
        morning: typeof day.morning === "string" ? day.morning : "",
        afternoon: typeof day.afternoon === "string" ? day.afternoon : "",
        evening: typeof day.evening === "string" ? day.evening : "",
        tips: asStringArray(day.tips),
      },
    ]
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function isPaidPaymentStatus(status: string | null | undefined) {
  return status === "paid" || status === "completed"
}

function resolvePurchaseLabel(payment: Pick<PaymentRow, "plan" | "credits">) {
  if (payment.credits > 0) {
    return `${payment.credits} créditos`
  }

  if (payment.plan === "pack_5") {
    return "5 créditos"
  }

  if (payment.plan === "pack_15") {
    return "15 créditos"
  }

  if (payment.plan === "pack_30") {
    return "30 créditos"
  }

  return "Pacote indisponível"
}

function mapPaymentToAdminPurchase(
  payment: Pick<PaymentRow, "id" | "user_id" | "email" | "amount_cents" | "created_at" | "status" | "credits" | "plan">,
  userLabels: Map<string, string>,
) {
  return {
    id: payment.id,
    user: payment.user_id ? userLabels.get(payment.user_id) ?? payment.email ?? payment.user_id : payment.email ?? "Sem usuário",
    email: payment.email,
    plan: payment.plan,
    packLabel: resolvePurchaseLabel(payment),
    credits: payment.credits ?? 0,
    value: formatCurrency((payment.amount_cents ?? 0) / 100),
    amountCents: payment.amount_cents ?? 0,
    date: payment.created_at,
    status: payment.status ?? "pendente",
  }
}

function mapSearchRowToSearch(row: SearchRow): Search {
  const rawResult = typeof row.result === "object" && row.result !== null ? (row.result as Record<string, unknown>) : {}
  const shortItinerary = asStringArray(rawResult.itinerary)
  const fullItinerary = asStringArray(rawResult.fullItinerary)
  const detailedItinerary = asDetailedItinerary(rawResult.detailedItinerary)
  const tips = asStringArray(rawResult.tips)
  const destination = typeof rawResult.destination === "string" ? rawResult.destination : "Destino indisponível"
  const estimatedCost = typeof rawResult.estimatedCost === "string" ? rawResult.estimatedCost : "R$ 0"
  const summary = typeof rawResult.summary === "string" ? rawResult.summary : row.prompt
  const bestFor = typeof rawResult.bestFor === "string" ? rawResult.bestFor : "indefinido"
  const context = typeof rawResult.context === "string" ? rawResult.context : `Busca via ${row.source}`
  const intelligence =
    typeof rawResult.intelligence === "object" && rawResult.intelligence !== null
      ? (rawResult.intelligence as TripResult["intelligence"])
      : undefined

  const result: TripResult = {
    destination,
    estimatedCost,
    bestFor,
    summary,
    itinerary: shortItinerary,
    fullItinerary,
    detailedItinerary,
    tips,
    context,
    intelligence,
  }

  return {
    id: row.id,
    userId: row.user_id ?? "",
    origin: row.source === "quiz" ? "quiz" : "busca",
    input: row.prompt,
    destination,
    estimatedCost,
    shortItinerary,
    fullItinerary,
    tips,
    createdAt: row.created_at,
    result,
  }
}

function mapProfileRowToUser(
  row: Pick<ProfileRow, "id" | "email" | "credits" | "role" | "created_at"> & { status?: ProfileRow["status"] },
): User {
  return {
    id: row.id,
    name: row.email,
    email: row.email,
    phone: "",
    credits: row.credits,
    role: row.role,
    status: row.status ?? "active",
    freeSearchUsed: true,
    planLabel: row.role === "admin" ? "Administrador" : "Usuário",
    joinedAt: row.created_at ?? "",
  }
}

async function listAdminUsers() {
  try {
    const supabase = createSupabaseAdminClient()
    const withStatus = await supabase
      .from("profiles")
      .select("id,email,credits,role,status,created_at")
      .order("created_at", { ascending: false })

    if (!withStatus.error && withStatus.data) {
      return (
        withStatus.data as Array<
          Pick<ProfileRow, "id" | "email" | "credits" | "role" | "created_at"> & { status?: ProfileRow["status"] }
        >
      ).map(mapProfileRowToUser)
    }

    const missingStatusColumn =
      withStatus.error?.code === "PGRST204" || withStatus.error?.message?.toLowerCase().includes("status")

    if (!missingStatusColumn) {
      logAdminQueryError("profiles", withStatus.error)
      return []
    }

    const fallback = await supabase
      .from("profiles")
      .select("id,email,credits,role,created_at")
      .order("created_at", { ascending: false })

    if (fallback.error || !fallback.data) {
      logAdminQueryError("profiles", fallback.error)
      return []
    }

    return (fallback.data as Array<Pick<ProfileRow, "id" | "email" | "credits" | "role" | "created_at">>).map((row) =>
      mapProfileRowToUser({ ...row, status: "active" }),
    )
  } catch (error) {
    logAdminQueryError("profiles", {
      message: error instanceof Error ? error.message : String(error),
      code: undefined,
      details: null,
      hint: null,
    })
    return []
  }
}

async function listAdminSearches() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("searches").select("*").order("created_at", { ascending: false })

    if (error || !data) {
      logAdminQueryError("searches", error)
      return []
    }

    return (data as SearchRow[]).map(mapSearchRowToSearch)
  } catch (error) {
    logAdminQueryError("searches", {
      message: error instanceof Error ? error.message : String(error),
      code: undefined,
      details: null,
      hint: null,
    })
    return []
  }
}

async function listAdminCreditTransactions() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("credit_transactions").select("*").order("created_at", { ascending: false })

    if (error || !data) {
      logAdminQueryError("credit_transactions", error)
      return []
    }

    return data as CreditTransactionRow[]
  } catch (error) {
    logAdminQueryError("credit_transactions", {
      message: error instanceof Error ? error.message : String(error),
      code: undefined,
      details: null,
      hint: null,
    })
    return []
  }
}

async function listAdminPayments() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("payments")
      .select("id,user_id,email,amount_cents,created_at,status,credits,plan")
      .order("created_at", { ascending: false })

    if (error || !data) {
      logAdminQueryError("payments", error)
      return []
    }

    return data as Array<
      Pick<PaymentRow, "id" | "user_id" | "email" | "amount_cents" | "created_at" | "status" | "credits" | "plan">
    >
  } catch (error) {
    logAdminQueryError("payments", {
      message: error instanceof Error ? error.message : String(error),
      code: undefined,
      details: null,
      hint: null,
    })
    return []
  }
}

async function listAdminSupportTickets() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false })

    if (error || !data) {
      logAdminQueryError("support_tickets", error)
      return []
    }

    return (data as SupportTicketRow[]).map(mapSupportTicketRow)
  } catch (error) {
    logAdminQueryError("support_tickets", {
      message: error instanceof Error ? error.message : String(error),
      code: undefined,
      details: null,
      hint: null,
    })
    return []
  }
}

export async function getAdminFinanceData(): Promise<AdminFinanceData> {
  const [payments, creditTransactions, users] = await Promise.all([
    listAdminPayments().catch(() => []),
    listAdminCreditTransactions().catch(() => []),
    listAdminUsers().catch(() => []),
  ])

  const userLabels = new Map(users.map((user) => [user.id, user.email]))
  const paidPayments = payments.filter((payment) => isPaidPaymentStatus(payment.status))
  const recentPurchases = paidPayments.slice(0, 10).map((payment) => mapPaymentToAdminPurchase(payment, userLabels))

  const soldCreditsFromTransactions = creditTransactions
    .filter((transaction) => transaction.type === "purchase" && transaction.credits > 0)
    .reduce((total, transaction) => total + transaction.credits, 0)

  const soldCreditsFromPayments = paidPayments.reduce((total, payment) => total + Math.max(payment.credits ?? 0, 0), 0)

  return {
    paymentsCount: paidPayments.length,
    soldCredits: soldCreditsFromTransactions || soldCreditsFromPayments,
    estimatedRevenueCents: paidPayments.reduce((total, payment) => total + Math.max(payment.amount_cents ?? 0, 0), 0),
    recentPurchases,
  }
}

export async function getAdminSupportData(): Promise<AdminSupportData> {
  const tickets = await listAdminSupportTickets().catch(() => [])

  return {
    openCount: tickets.filter((ticket) => ticket.status === "open").length,
    inReviewCount: tickets.filter((ticket) => ticket.status === "in_review").length,
    resolvedCount: tickets.filter((ticket) => ticket.status === "resolved").length,
    recentTickets: tickets.slice(0, 20),
  }
}

export async function getAdminPanelData(): Promise<AdminPanelData> {
  const [users, searches, creditTransactions, finance, support] = await Promise.all([
    listAdminUsers().catch(() => []),
    listAdminSearches().catch(() => []),
    listAdminCreditTransactions().catch(() => []),
    getAdminFinanceData().catch(() => ({
      paymentsCount: 0,
      soldCredits: 0,
      estimatedRevenueCents: 0,
      recentPurchases: [],
    })),
    getAdminSupportData().catch(() => ({
      openCount: 0,
      inReviewCount: 0,
      resolvedCount: 0,
      recentTickets: [],
    })),
  ])

  return {
    users,
    searches,
    purchases: finance.recentPurchases,
    creditTransactions,
    finance,
    support,
  }
}
