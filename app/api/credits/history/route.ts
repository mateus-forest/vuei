import { NextResponse } from "next/server"
import { getUserCreditHistory } from "@/lib/services/credit-transaction-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET() {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return NextResponse.json({ ok: false, error: "Faça login para acessar seu histórico de créditos." }, { status: 401 })
  }

  const history = await getUserCreditHistory({
    supabase: createSupabaseAdminClient(),
    userId: session.userId,
    limit: 50,
  })

  if (!history) {
    return NextResponse.json({ ok: false, error: "Não foi possível carregar seu histórico de créditos." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: history })
}
