import { NextResponse } from "next/server"
import { getAIGenerationMetrics } from "@/lib/services/ai-generation-log-service"
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
    console.error("ADMIN AI METRICS PROFILE ERROR", {
      message: profileError.message,
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
    })
    return jsonError("Não foi possível validar o acesso às métricas de IA.", 500)
  }

  if (profile?.role !== "admin") {
    return jsonError("Apenas administradores podem acessar as métricas de IA.", 403)
  }

  const metrics = await getAIGenerationMetrics()

  return jsonOk(metrics)
}
