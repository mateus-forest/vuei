import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { CREDITS_PER_GENERATED_TRIP } from "@/lib/services/credit-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { enrichTripResultWithFullItinerary } from "@/lib/services/trip-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { SearchRow } from "@/types/database"
import type { TripGenerationInput, TripResult } from "@/types/trip"

function hasGeneratedFullItinerary(result: TripResult) {
  return Boolean(result.generatedSections?.fullItinerary) && Boolean(result.detailedItinerary?.length)
}

function buildRequestFromSearch(search: SearchRow, result: TripResult): TripGenerationInput {
  return {
    origin: search.source === "quiz" ? "quiz" : "busca",
    inputText: search.prompt,
    travelers: result.travelers,
  }
}

export async function POST(_: Request, context: { params: Promise<{ tripId: string }> }) {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return NextResponse.json({ ok: false, error: "Faça login para gerar o roteiro completo." }, { status: 401 })
  }

  const { tripId } = await context.params

  if (!tripId) {
    return NextResponse.json({ ok: false, error: "TripId inválido." }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: searchRow, error: searchError } = await supabase
    .from("searches")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", session.userId)
    .maybeSingle()

  if (searchError || !searchRow) {
    return NextResponse.json({ ok: false, error: "Viagem não encontrada." }, { status: 404 })
  }

  const rawResult =
    typeof searchRow.result === "object" && searchRow.result !== null ? (searchRow.result as TripResult) : null

  if (!rawResult) {
    return NextResponse.json({ ok: false, error: "Resultado da viagem indisponível." }, { status: 400 })
  }

  if (hasGeneratedFullItinerary(rawResult)) {
    return NextResponse.json({ ok: true, data: { tripId, result: rawResult, remainingCredits: null, creditsConsumed: 0 } })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,credits")
    .eq("id", session.userId)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ ok: false, error: "Não foi possível validar seus créditos." }, { status: 500 })
  }

  const availableCredits = typeof profile.credits === "number" ? profile.credits : 0

  if (availableCredits <= 0) {
    return NextResponse.json({ ok: false, error: "Você não tem créditos disponíveis para gerar o roteiro completo." }, { status: 402 })
  }

  const enrichedResult = enrichTripResultWithFullItinerary(rawResult, buildRequestFromSearch(searchRow as SearchRow, rawResult))
  const now = new Date().toISOString()
  const newCreditsBalance = availableCredits - CREDITS_PER_GENERATED_TRIP
  const transactionDescription = `full_itinerary:${tripId}`

  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      credits: newCreditsBalance,
    })
    .eq("id", session.userId)
    .eq("credits", availableCredits)
    .gt("credits", 0)
    .select("credits")
    .maybeSingle()

  if (profileUpdateError || !updatedProfile) {
    return NextResponse.json({ ok: false, error: "Seu saldo foi atualizado. Tente novamente." }, { status: 409 })
  }

  const { error: transactionError } = await supabase.from("credit_transactions").insert({
    id: randomUUID(),
    user_id: session.userId,
    email: profile.email ?? session.email ?? null,
    type: "usage",
    credits: -CREDITS_PER_GENERATED_TRIP,
    description: transactionDescription,
    payment_id: null,
    created_at: now,
  })

  if (transactionError) {
    await supabase
      .from("profiles")
      .update({
        credits: availableCredits,
      })
      .eq("id", session.userId)
      .eq("credits", newCreditsBalance)

    return NextResponse.json({ ok: false, error: "Não foi possível registrar o consumo do crédito." }, { status: 500 })
  }

  const nextCreditsUsed = Math.max(Number(searchRow.credits_used ?? 0), 0) + CREDITS_PER_GENERATED_TRIP
  const persistedResult: TripResult = {
    ...enrichedResult,
    creditsConsumed: Math.max(Number(rawResult.creditsConsumed ?? 0), 0) + CREDITS_PER_GENERATED_TRIP,
    linkedAfterLogin: rawResult.linkedAfterLogin ?? false,
    source: rawResult.source ?? "authenticated",
    isAnonymousPreview: false,
    requiresAuthForActions: false,
  }

  const { error: updateSearchError } = await supabase
    .from("searches")
    .update({
      result: persistedResult,
      credits_used: nextCreditsUsed,
    })
    .eq("id", tripId)
    .eq("user_id", session.userId)

  if (updateSearchError) {
    await supabase
      .from("profiles")
      .update({
        credits: availableCredits,
      })
      .eq("id", session.userId)
      .eq("credits", newCreditsBalance)

    await supabase
      .from("credit_transactions")
      .delete()
      .eq("user_id", session.userId)
      .eq("description", transactionDescription)

    return NextResponse.json({ ok: false, error: "Não foi possível salvar o roteiro completo." }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    data: {
      tripId,
      result: persistedResult,
      remainingCredits: updatedProfile.credits,
      creditsConsumed: 1,
    },
  })
}
