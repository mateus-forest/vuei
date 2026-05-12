import { NextResponse } from "next/server"
import { getAdminFinanceData } from "@/lib/services/admin-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

function jsonOk(data: unknown) {
  return NextResponse.json({ ok: true, data })
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET() {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return jsonError("Faça login para continuar.", 401)
  }

  const supabase = createSupabaseAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", session.userId)
    .maybeSingle()

  if (profileError) {
    console.error("ADMIN FINANCE PROFILE ERROR", {
      message: profileError.message,
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
    })
    return jsonError("Não foi possível validar o acesso ao financeiro.", 500)
  }

  if (profile?.role !== "admin") {
    return jsonError("Apenas administradores podem acessar o financeiro.", 403)
  }

  const finance = await getAdminFinanceData()

  return jsonOk(finance)
}
