import type { Search } from "@/types/search"
import type { TripItineraryDay, TripResult } from "@/types/trip"
import type { SearchRow } from "@/types/database"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

function asVariants(value: unknown): TripResult["variants"] {
  return Array.isArray(value) ? (value as TripResult["variants"]) : undefined
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asDetailedItinerary(value: unknown): TripItineraryDay[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is TripItineraryDay =>
          typeof item === "object" &&
          item !== null &&
          typeof item.day === "number" &&
          typeof item.title === "string" &&
          typeof item.morning === "string" &&
          typeof item.afternoon === "string" &&
          typeof item.evening === "string" &&
          Array.isArray(item.tips),
      )
    : []
}

function mapSearchRowToSearch(row: SearchRow): Search {
  const rawResult = typeof row.result === "object" && row.result !== null ? (row.result as Record<string, unknown>) : {}
  const shortItinerary = asStringArray(rawResult.itinerary)
  const fullItinerary = asStringArray(rawResult.fullItinerary)
  const detailedItinerary = asDetailedItinerary(rawResult.detailedItinerary)
  const tips = asStringArray(rawResult.tips)
  const destination = typeof rawResult.destination === "string" ? rawResult.destination : "Destino indisponível"
  const estimatedCost = typeof rawResult.estimatedCost === "string" ? rawResult.estimatedCost : "R$ 0"
  const summary = typeof rawResult.summary === "string" ? rawResult.summary : row.prompt
  const bestFor = typeof rawResult.bestFor === "string" ? rawResult.bestFor : "indefinido"
  const context = typeof rawResult.context === "string" ? rawResult.context : `Busca via ${row.source}`
  const periodLabel = typeof rawResult.periodLabel === "string" ? rawResult.periodLabel : undefined
  const startDate = typeof rawResult.startDate === "string" ? rawResult.startDate : undefined
  const endDate = typeof rawResult.endDate === "string" ? rawResult.endDate : undefined
  const durationDays = typeof rawResult.durationDays === "number" ? rawResult.durationDays : undefined
  const durationLabel = typeof rawResult.durationLabel === "string" ? rawResult.durationLabel : undefined
  const isSuggestedPeriod = typeof rawResult.isSuggestedPeriod === "boolean" ? rawResult.isSuggestedPeriod : undefined
  const periodReason = typeof rawResult.periodReason === "string" ? rawResult.periodReason : undefined
  const travelers = typeof rawResult.travelers === "number" ? rawResult.travelers : undefined
  const currency = rawResult.currency === "BRL" ? "BRL" : undefined
  const variants = asVariants(rawResult.variants)
  const cheapestAlternative = typeof rawResult.cheapestAlternative === "string" ? rawResult.cheapestAlternative : undefined
  const source = rawResult.source === "authenticated" || rawResult.source === "anonymous_landing" ? rawResult.source : undefined
  const resultType = rawResult.resultType === "full" || rawResult.resultType === "preview" ? rawResult.resultType : undefined
  const isAnonymousPreview = typeof rawResult.isAnonymousPreview === "boolean" ? rawResult.isAnonymousPreview : undefined
  const requiresAuthForActions = typeof rawResult.requiresAuthForActions === "boolean" ? rawResult.requiresAuthForActions : undefined
  const linkedAfterLogin = typeof rawResult.linkedAfterLogin === "boolean" ? rawResult.linkedAfterLogin : undefined
  const creditsConsumed = typeof rawResult.creditsConsumed === "number" ? rawResult.creditsConsumed : undefined
  const selectedVariantType =
    rawResult.selectedVariantType === "economic" ||
    rawResult.selectedVariantType === "intermediate" ||
    rawResult.selectedVariantType === "premium"
      ? rawResult.selectedVariantType
      : undefined
  const generatedSections =
    typeof rawResult.generatedSections === "object" && rawResult.generatedSections !== null
      ? (rawResult.generatedSections as TripResult["generatedSections"])
      : undefined
  const intelligence =
    typeof rawResult.intelligence === "object" && rawResult.intelligence !== null
      ? (rawResult.intelligence as TripResult["intelligence"])
      : undefined

  const result: TripResult = {
    destination,
    estimatedCost,
    bestFor,
    summary,
    periodLabel,
    startDate,
    endDate,
    durationDays,
    durationLabel,
    isSuggestedPeriod,
    periodReason,
    travelers,
    currency,
    variants,
    itinerary: shortItinerary,
    fullItinerary,
    detailedItinerary,
    tips,
    context,
    cheapestAlternative,
    intelligence,
    source,
    resultType,
    isAnonymousPreview,
    requiresAuthForActions,
    linkedAfterLogin,
    creditsConsumed,
    selectedVariantType,
    generatedSections,
  }

  return {
    id: row.id,
    userId: row.user_id ?? "",
    origin: row.source === "quiz" ? "quiz" : "busca",
    input: row.prompt,
    destination,
    estimatedCost,
    shortItinerary,
    fullItinerary,
    tips,
    createdAt: row.created_at,
    result,
  }
}

export async function listSearches() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("searches").select("*").order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as SearchRow[]).map(mapSearchRowToSearch)
}

export async function listTravelHistory() {
  return listSearches()
}

export async function listUserTravelHistory(userId: string | null | undefined) {
  if (!userId) return []

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("searches").select("*").eq("user_id", userId).order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as SearchRow[]).map(mapSearchRowToSearch)
}

export async function getTravelHistoryItem(searchId: string | null | undefined, userId?: string | null) {
  if (!searchId) return null

  const supabase = await createSupabaseServerClient()
  let query = supabase.from("searches").select("*").eq("id", searchId)

  if (userId) {
    query = query.eq("user_id", userId)
  } else {
    query = query.is("user_id", null)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    return null
  }

  return mapSearchRowToSearch(data as SearchRow)
}
