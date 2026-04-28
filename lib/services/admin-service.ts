import type { CreditTransactionRow, PaymentRow, ProfileRow, SearchRow } from "@/types/database"
import type { Search } from "@/types/search"
import type { User } from "@/types/user"
import type { TripResult } from "@/types/trip"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type AdminPurchase = {
  id: string
  user: string
  packLabel: string
  value: string
  date: string
  status: string
}

function logAdminQueryError(
  table: "profiles" | "searches" | "credit_transactions" | "payments",
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function mapSearchRowToSearch(row: SearchRow): Search {
  const rawResult = typeof row.result === "object" && row.result !== null ? (row.result as Record<string, unknown>) : {}
  const shortItinerary = asStringArray(rawResult.itinerary)
  const fullItinerary = asStringArray(rawResult.fullItinerary)
  const tips = asStringArray(rawResult.tips)
  const destination = typeof rawResult.destination === "string" ? rawResult.destination : "Destino indisponível"
  const estimatedCost = typeof rawResult.estimatedCost === "string" ? rawResult.estimatedCost : "R$ 0"
  const summary = typeof rawResult.summary === "string" ? rawResult.summary : row.prompt
  const bestFor = typeof rawResult.bestFor === "string" ? rawResult.bestFor : "indefinido"
  const context = typeof rawResult.context === "string" ? rawResult.context : `Busca via ${row.source}`

  const result: TripResult = {
    destination,
    estimatedCost,
    bestFor,
    summary,
    itinerary: shortItinerary,
    fullItinerary,
    tips,
    context,
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
      .select("id,user_id,email,amount_cents,created_at,status,credits")
      .order("created_at", { ascending: false })

    if (error || !data) {
      logAdminQueryError("payments", error)
      return []
    }

    return data as Array<
      Pick<PaymentRow, "id" | "user_id" | "email" | "amount_cents" | "created_at" | "status" | "credits">
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

export async function getAdminPanelData() {
  const [users, searches, creditTransactions, payments] = await Promise.all([
    listAdminUsers().catch(() => []),
    listAdminSearches().catch(() => []),
    listAdminCreditTransactions().catch(() => []),
    listAdminPayments().catch(() => []),
  ])

  const userLabels = new Map(users.map((user) => [user.id, user.email]))
  const purchases: AdminPurchase[] = payments.map((payment) => ({
    id: payment.id,
    user: payment.user_id ? userLabels.get(payment.user_id) ?? payment.user_id : "Sem usuário",
    packLabel: payment.credits ? `${payment.credits} créditos` : "Pacote indisponível",
    value: formatCurrency((payment.amount_cents ?? 0) / 100),
    date: payment.created_at,
    status: payment.status ?? "pendente",
  }))

  return {
    users,
    searches,
    purchases,
    creditTransactions,
  }
}
