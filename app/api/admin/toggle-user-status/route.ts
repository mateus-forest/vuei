import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/services/server-session-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const payloadSchema = z.object({
  userId: z.string().uuid(),
})

function jsonOk(data: unknown) {
  return NextResponse.json({ ok: true, data })
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
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
    return jsonError("Dados inválidos para alterar o status do usuário.", 400)
  }

  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError("Dados inválidos para alterar o status do usuário.", 400)
  }

  if (parsed.data.userId === session.userId) {
    return jsonError("Você não pode bloquear a si mesmo.", 400)
  }

  const supabase = createSupabaseAdminClient()
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", session.userId)
    .maybeSingle()

  if (adminProfile?.role !== "admin") {
    return jsonError("Apenas administradores podem executar esta ação.", 403)
  }

  const targetQuery = await supabase.from("profiles").select("id, status").eq("id", parsed.data.userId).maybeSingle()

  if (targetQuery.error) {
    console.error("ADMIN TOGGLE USER STATUS ERROR", {
      message: targetQuery.error.message,
      code: targetQuery.error.code,
      details: targetQuery.error.details,
      hint: targetQuery.error.hint,
    })

    const missingStatusColumn =
      targetQuery.error.code === "PGRST204" || targetQuery.error.message.toLowerCase().includes("status")

    if (missingStatusColumn) {
      return jsonError("Campo status ainda não configurado no banco.", 500)
    }

    return jsonError("Não foi possível alterar o status do usuário agora.", 500)
  }

  if (!targetQuery.data) {
    return jsonError("Usuário não encontrado.", 404)
  }

  const nextStatus = targetQuery.data.status === "blocked" ? "active" : "blocked"
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ status: nextStatus })
    .eq("id", parsed.data.userId)

  if (updateError) {
    console.error("ADMIN TOGGLE USER STATUS UPDATE ERROR", {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    })
    return jsonError("Não foi possível alterar o status do usuário agora.", 500)
  }

  return jsonOk({ userId: parsed.data.userId, status: nextStatus })
}
