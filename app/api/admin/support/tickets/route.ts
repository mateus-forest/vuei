import { NextResponse } from "next/server"
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
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", session.userId)
    .maybeSingle()

  if (adminError) {
    console.error("ADMIN SUPPORT TICKETS PROFILE ERROR", adminError)
    return jsonError("Não foi possível validar o acesso ao suporte.", 500)
  }

  if (adminProfile?.role !== "admin") {
    return jsonError("Apenas administradores podem acessar os chamados.", 403)
  }

  const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("ADMIN SUPPORT TICKETS LIST ERROR", error)
    return jsonError("Não foi possível carregar os chamados agora.", 500)
  }

  return jsonOk(data ?? [])
}
