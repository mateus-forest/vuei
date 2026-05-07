import { randomUUID } from "crypto"
import { INITIAL_BONUS_CREDITS } from "@/lib/services/credit-service"
import type { CreditHistorySummary, CreditTransactionEntry, CreditTransactionType } from "@/types/credit"
import type { CreditTransactionRow, ProfileRow } from "@/types/database"

type SupabaseAdminClientLike = any

type RecordCreditTransactionInput = {
  supabase: SupabaseAdminClientLike
  userId: string
  email: string | null
  type: CreditTransactionType
  credits: number
  description: string
  paymentId?: string | null
  createdAt?: string
}

function mapCreditTransactionRow(row: CreditTransactionRow): CreditTransactionEntry {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    type: row.type,
    credits: row.credits,
    description: row.description,
    paymentId: row.payment_id,
    createdAt: row.created_at,
  }
}

export async function recordCreditTransaction({
  supabase,
  userId,
  email,
  type,
  credits,
  description,
  paymentId = null,
  createdAt,
}: RecordCreditTransactionInput) {
  const { error } = await supabase.from("credit_transactions").insert({
    id: randomUUID(),
    user_id: userId,
    email,
    type,
    credits,
    description,
    payment_id: paymentId,
    created_at: createdAt ?? new Date().toISOString(),
  })

  return { error: error ?? null }
}

export async function ensureSignupBonusTransaction({
  supabase,
  userId,
  email,
  createdAt,
}: {
  supabase: SupabaseAdminClientLike
  userId: string
  email: string | null
  createdAt?: string
}) {
  const existingLookup = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "bonus_signup")
    .maybeSingle()

  if (existingLookup.data) {
    return { created: false as const, error: null }
  }

  const transaction = await recordCreditTransaction({
    supabase,
    userId,
    email,
    type: "bonus_signup",
    credits: INITIAL_BONUS_CREDITS,
    description: "Crédito bônus de cadastro",
    createdAt,
  })

  return { created: !transaction.error, error: transaction.error }
}

export async function getUserCreditHistory({
  supabase,
  userId,
  limit = 50,
}: {
  supabase: SupabaseAdminClientLike
  userId: string
  limit?: number
}): Promise<CreditHistorySummary | null> {
  const profileLookup = await supabase.from("profiles").select("credits").eq("id", userId).maybeSingle()
  const transactionLookup = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!profileLookup.data || !transactionLookup.data) {
    return null
  }

  const profile = profileLookup.data as Pick<ProfileRow, "credits">
  const transactions = (transactionLookup.data as CreditTransactionRow[]).map(mapCreditTransactionRow)
  const totalGained = transactions.filter((item) => item.credits > 0).reduce((sum, item) => sum + item.credits, 0)
  const totalSpent = transactions.filter((item) => item.credits < 0).reduce((sum, item) => sum + Math.abs(item.credits), 0)
  const countsByType = transactions.reduce<Partial<Record<CreditTransactionType, number>>>((acc, transaction) => {
    acc[transaction.type] = (acc[transaction.type] ?? 0) + 1
    return acc
  }, {})

  return {
    currentBalance: typeof profile.credits === "number" ? profile.credits : 0,
    totalGained,
    totalSpent,
    countsByType,
    transactions,
  }
}
