import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/services/server-session-service"
import { listUserTravelHistory } from "@/lib/services/search-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET() {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return NextResponse.json({ ok: false, error: "Faça login para acessar seu histórico." }, { status: 401 })
  }

  return NextResponse.json(await listUserTravelHistory(session.userId))
}

export async function POST(request: Request) {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return NextResponse.json({ ok: false, error: "Faça login para salvar a viagem." }, { status: 401 })
  }

  let body: { tripId?: string } = {}

  try {
    body = (await request.json()) as { tripId?: string }
  } catch {
    body = {}
  }

  if (!body.tripId) {
    return NextResponse.json({ ok: false, error: "TripId não informado." }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: existingSearch, error: existingSearchError } = await supabase
    .from("searches")
    .select("id,result")
    .eq("id", body.tripId)
    .is("user_id", null)
    .maybeSingle()

  if (existingSearchError || !existingSearch) {
    return NextResponse.json({ ok: false, error: "Preview não encontrado para vinculação." }, { status: 404 })
  }

  const rawResult =
    typeof existingSearch.result === "object" && existingSearch.result !== null
      ? (existingSearch.result as Record<string, unknown>)
      : {}

  const updatedResult = {
    ...rawResult,
    source: "anonymous_landing",
    resultType: rawResult.resultType === "full" ? "full" : "preview",
    isAnonymousPreview: false,
    requiresAuthForActions: false,
    linkedAfterLogin: true,
    creditsConsumed: typeof rawResult.creditsConsumed === "number" ? rawResult.creditsConsumed : 0,
  }

  const { error: updateError } = await supabase
    .from("searches")
    .update({
      user_id: session.userId,
      result: updatedResult,
      credits_used: 0,
    })
    .eq("id", body.tripId)
    .is("user_id", null)

  if (updateError) {
    console.error("ANONYMOUS SEARCH LINK ERROR:", updateError)
    return NextResponse.json({ ok: false, error: "Não foi possível vincular a viagem agora." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: { tripId: body.tripId } })
}
