import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/services/server-session-service"
import { supportTicketCategories } from "@/lib/services/support-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const payloadSchema = z.object({
  category: z.enum(supportTicketCategories),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
  related_search_id: z.string().uuid().optional().nullable(),
  related_payment_id: z.string().uuid().optional().nullable(),
})

function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

function jsonError(error: string, status: number, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

async function validateRelatedEntities({
  supabase,
  userId,
  relatedSearchId,
  relatedPaymentId,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  userId: string
  relatedSearchId: string | null
  relatedPaymentId: string | null
}) {
  if (relatedSearchId) {
    const { data: search, error: searchError } = await supabase
      .from("searches")
      .select("id")
      .eq("id", relatedSearchId)
      .eq("user_id", userId)
      .maybeSingle()

    if (searchError || !search) {
      return { ok: false as const, error: "Busca relacionada inválida." }
    }
  }

  if (relatedPaymentId) {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id")
      .eq("id", relatedPaymentId)
      .eq("user_id", userId)
      .maybeSingle()

    if (paymentError || !payment) {
      return { ok: false as const, error: "Pagamento relacionado inválido." }
    }
  }

  return { ok: true as const }
}

export async function GET() {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return jsonError("Faça login para continuar.", 401)
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("SUPPORT TICKETS LIST ERROR", error)
    return jsonError("Não foi possível carregar seus chamados agora.", 500)
  }

  return jsonOk(data ?? [])
}

export async function POST(request: Request) {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return jsonError("Faça login para continuar.", 401)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Dados inválidos para abrir chamado.", 400)
  }

  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError("Dados inválidos para abrir chamado.", 400, parsed.error.message)
  }

  const subject = parsed.data.subject?.trim() ? parsed.data.subject.trim() : null
  const relatedSearchId = parsed.data.related_search_id ?? null
  const relatedPaymentId = parsed.data.related_payment_id ?? null

  const supabase = createSupabaseAdminClient()
  const relationValidation = await validateRelatedEntities({
    supabase,
    userId: session.userId,
    relatedSearchId,
    relatedPaymentId,
  })

  if (!relationValidation.ok) {
    return jsonError(relationValidation.error, 400)
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: session.userId,
      email: session.email,
      category: parsed.data.category,
      subject,
      message: parsed.data.message.trim(),
      status: "open",
      priority: "normal",
      related_search_id: relatedSearchId,
      related_payment_id: relatedPaymentId,
    })
    .select("*")
    .single()

  if (error || !data) {
    console.error("SUPPORT TICKET CREATE ERROR", error)
    return jsonError("Não foi possível abrir seu chamado agora.", 500)
  }

  return jsonOk(data, { status: 201 })
}
