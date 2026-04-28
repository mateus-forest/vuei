import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/services/server-session-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const payloadSchema = z.object({
  userId: z.string().uuid(),
  credits: z.number().int().positive(),
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
    return jsonError("Dados inválidos para adicionar créditos.", 400)
  }

  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError("Dados inválidos para adicionar créditos.", 400)
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

  const { userId, credits } = parsed.data
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, email, credits")
    .eq("id", userId)
    .maybeSingle()

  if (targetError || !targetProfile) {
    return jsonError("Usuário não encontrado.", 404)
  }

  const nextCredits = (targetProfile.credits ?? 0) + credits
  const { error: updateError } = await supabase.from("profiles").update({ credits: nextCredits }).eq("id", userId)

  if (updateError) {
    console.error("ADMIN ADD CREDITS UPDATE ERROR", {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    })
    return jsonError("Não foi possível adicionar créditos agora.", 500)
  }

  const { error: transactionError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    email: targetProfile.email,
    type: "manual",
    credits,
    description: "Créditos adicionados manualmente pelo admin",
    payment_id: null,
  })

  if (transactionError) {
    console.error("ADMIN ADD CREDITS TRANSACTION ERROR", {
      message: transactionError.message,
      code: transactionError.code,
      details: transactionError.details,
      hint: transactionError.hint,
    })
  }

  return jsonOk({ userId, credits: nextCredits })
}
