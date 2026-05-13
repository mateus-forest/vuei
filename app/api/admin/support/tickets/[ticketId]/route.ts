import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/services/server-session-service"
import { supportTicketPriorities, supportTicketStatuses } from "@/lib/services/support-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const payloadSchema = z
  .object({
    status: z.enum(supportTicketStatuses).optional(),
    priority: z.enum(supportTicketPriorities).optional(),
    admin_note: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((value) => value.status !== undefined || value.priority !== undefined || value.admin_note !== undefined, {
    message: "Envie ao menos um campo para atualizar.",
  })

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

  return jsonOk(data)
}
