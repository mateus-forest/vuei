import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type AIGenerationType = "preview" | "full_itinerary" | "adjustment" | "comparison"
export type AIGenerationSource = "anonymous_landing" | "authenticated"

export type AIGenerationLogInput = {
  userId?: string | null
  source: AIGenerationSource
  generationType: AIGenerationType
  success: boolean
  usedFallback: boolean
  openaiError?: string | null
  durationMs: number
  model?: string | null
  createdAt?: string
}

export type AIGenerationMetrics = {
  totalGenerations: number
  fallbackRate: number
  errorRate: number
  averageDurationMs: number
  recentFailures: Array<{
    id: string
    source: string
    generationType: string
    openaiError: string | null
    createdAt: string
  }>
}

type AIGenerationLogRow = {
  id: string
  source: string
  generation_type: string
  success: boolean
  used_fallback: boolean
  openai_error: string | null
  duration_ms: number | null
  created_at: string
}

function normalizeDuration(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.round(value)
}

function sanitizeOpenAIError(error: string | null | undefined) {
  if (!error) {
    return null
  }

  return error.replace(/\s+/g, " ").trim().slice(0, 300)
}

export async function recordAIGenerationLog({
  userId,
  source,
  generationType,
  success,
  usedFallback,
  openaiError,
  durationMs,
  model,
  createdAt,
}: AIGenerationLogInput) {
  try {
    const supabase = createSupabaseAdminClient()
    const payload = {
      user_id: userId ?? null,
      source,
      generation_type: generationType,
      success,
      used_fallback: usedFallback,
      openai_error: sanitizeOpenAIError(openaiError),
      duration_ms: normalizeDuration(durationMs),
      model: model ?? null,
      created_at: createdAt ?? new Date().toISOString(),
    }
    const { error } = await supabase.from("ai_generation_logs").insert(payload)

    if (error) {
      console.error("AI_GENERATION_LOG_INSERT_ERROR", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        source,
        generationType,
        success,
        usedFallback,
      })
    }

    return { error: error ?? null }
  } catch (error) {
    console.error("AI_GENERATION_LOG_INSERT_ERROR", {
      message: error instanceof Error ? error.message : String(error),
      source,
      generationType,
      success,
      usedFallback,
    })
    return { error }
  }
}

export async function getAIGenerationMetrics(): Promise<AIGenerationMetrics> {
  try {
    const supabase = createSupabaseAdminClient()
    const [countResult, aggregateResult, recentFailuresResult] = await Promise.all([
      supabase.from("ai_generation_logs").select("id", { count: "exact", head: true }),
      supabase.from("ai_generation_logs").select("success,used_fallback,duration_ms").limit(1000),
      supabase
        .from("ai_generation_logs")
        .select("id,source,generation_type,success,used_fallback,openai_error,duration_ms,created_at")
        .eq("success", false)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (aggregateResult.error || !aggregateResult.data) {
      if (aggregateResult.error) {
        console.error("AI_GENERATION_METRICS_QUERY_ERROR", {
          message: aggregateResult.error.message,
          code: aggregateResult.error.code,
          details: aggregateResult.error.details,
          hint: aggregateResult.error.hint,
        })
      }

      return {
        totalGenerations: countResult.count ?? 0,
        fallbackRate: 0,
        errorRate: 0,
        averageDurationMs: 0,
        recentFailures: [],
      }
    }

    const aggregateRows = aggregateResult.data
    const recentFailures = recentFailuresResult.data as AIGenerationLogRow[] | null
    const totalGenerations = countResult.count ?? aggregateRows.length
    const fallbackCount = aggregateRows.filter((item) => item.used_fallback).length
    const errorCount = aggregateRows.filter((item) => !item.success).length
    const totalDuration = aggregateRows.reduce((sum, item) => sum + Math.max(item.duration_ms ?? 0, 0), 0)
    const sampledTotal = aggregateRows.length

    return {
      totalGenerations,
      fallbackRate: sampledTotal > 0 ? fallbackCount / sampledTotal : 0,
      errorRate: sampledTotal > 0 ? errorCount / sampledTotal : 0,
      averageDurationMs: sampledTotal > 0 ? Math.round(totalDuration / sampledTotal) : 0,
      recentFailures: (recentFailures ?? []).map((item) => ({
        id: item.id,
        source: item.source,
        generationType: item.generation_type,
        openaiError: item.openai_error,
        createdAt: item.created_at,
      })),
    }
  } catch (error) {
    console.error("AI_GENERATION_METRICS_QUERY_ERROR", {
      message: error instanceof Error ? error.message : String(error),
    })

    return {
      totalGenerations: 0,
      fallbackRate: 0,
      errorRate: 0,
      averageDurationMs: 0,
      recentFailures: [],
    }
  }
}
