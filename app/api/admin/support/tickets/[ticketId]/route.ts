import { NextResponse } from "next/server"
import { z } from "zod"
import { recordCreditTransaction } from "@/lib/services/credit-transaction-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { supportTicketPriorities, supportTicketStatuses } from "@/lib/services/support-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const payloadSchema = z
  .object({
    status: z.enum(supportTicketStatuses).optional(),
    priority: z.enum(supportTicketPriorities).optional(),
    admin_note: z.string().trim().max(2000).optional().or(z.literal("")),
    customer_message: z.string().trim().max(2000).optional().or(z.literal("")),
    courtesy_credits: z.number().int().positive().max(100).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priority !== undefined ||
      value.admin_note !== undefined ||
      value.customer_message !== undefined ||
      value.courtesy_credits !== undefined,
    {
      message: "Envie ao menos um campo para atualizar.",
    },
  )

function jsonOk(data: unknown) {
  return NextResponse.json({ ok: true, data })
}

function jsonError(error: string, status: number, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

export async function PATCH(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return jsonError("Faça login para continuar.", 401)
  }

  const { ticketId } = await context.params

  if (!z.string().uuid().safeParse(ticketId).success) {
    return jsonError("Chamado inválido.", 400)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Dados inválidos para atualizar chamado.", 400)
  }

  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError("Dados inválidos para atualizar chamado.", 400, parsed.error.message)
  }

  const supabase = createSupabaseAdminClient()
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", session.userId)
    .maybeSingle()

  if (adminError) {
    console.error("ADMIN SUPPORT TICKET PROFILE ERROR", adminError)
    return jsonError("Não foi possível validar o acesso ao suporte.", 500)
  }

  if (adminProfile?.role !== "admin") {
    return jsonError("Apenas administradores podem atualizar chamados.", 403)
  }

  const { data: existingTicket, error: existingTicketError } = await supabase
    .from("support_tickets")
    .select("id,user_id,email")
    .eq("id", ticketId)
    .maybeSingle()

  if (existingTicketError || !existingTicket) {
    return jsonError("Chamado não encontrado.", 404)
  }

  const updatePayload: Record<string, string | null> = {}

  if (parsed.data.status !== undefined) {
    updatePayload.status = parsed.data.status
    updatePayload.resolved_at = parsed.data.status === "resolved" ? new Date().toISOString() : null
  }

  if (parsed.data.priority !== undefined) {
    updatePayload.priority = parsed.data.priority
  }

  if (parsed.data.admin_note !== undefined) {
    updatePayload.admin_note = parsed.data.admin_note.trim() ? parsed.data.admin_note.trim() : null
  }

  if (parsed.data.customer_message !== undefined) {
    updatePayload.customer_message = parsed.data.customer_message.trim() ? parsed.data.customer_message.trim() : null
    updatePayload.customer_message_at = parsed.data.customer_message.trim() ? new Date().toISOString() : null
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .update(updatePayload)
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error || !data) {
    console.error("ADMIN SUPPORT TICKET UPDATE ERROR", error)
    return jsonError("Não foi possível atualizar o chamado agora.", 500)
  }

  if (parsed.data.courtesy_credits && existingTicket.user_id) {
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("id,email,credits")
      .eq("id", existingTicket.user_id)
      .maybeSingle()

    if (targetProfileError || !targetProfile) {
      return jsonError("Usuário do chamado não encontrado para crédito de cortesia.", 404)
    }

    const nextCredits = (targetProfile.credits ?? 0) + parsed.data.courtesy_credits
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ credits: nextCredits })
      .eq("id", existingTicket.user_id)

    if (profileUpdateError) {
      console.error("ADMIN SUPPORT COURTESY CREDIT ERROR", profileUpdateError)
      return jsonError("Não foi possível aplicar o crédito de cortesia agora.", 500)
    }

    const { error: transactionError } = await recordCreditTransaction({
      supabase,
      userId: existingTicket.user_id,
      email: targetProfile.email ?? existingTicket.email,
      type: "system",
      credits: parsed.data.courtesy_credits,
      description: "Credito de cortesia - chamado resolvido",
    })

    if (transactionError) {
      console.error("ADMIN SUPPORT COURTESY CREDIT TRANSACTION ERROR", transactionError)
      return jsonError("Não foi possível registrar o crédito de cortesia agora.", 500)
    }
  }

  return jsonOk(data)
}
