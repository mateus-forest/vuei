"use client"

import { useEffect, useState } from "react"
import { Bot, Clock3, TriangleAlert, WandSparkles } from "lucide-react"
import { BrandCard } from "@/components/ui/brand-card"
import { formatShortDate } from "@/lib/utils/format"

type AIGenerationMetrics = {
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

type ApiResponse = { ok: true; data: AIGenerationMetrics } | { ok: false; error: string }

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatDuration(value: number) {
  if (!value) {
    return "0 ms"
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} s`
  }

  return `${value} ms`
}

function getGenerationTypeLabel(value: string) {
  if (value === "preview") return "Preview"
  if (value === "full_itinerary") return "Roteiro completo"
  if (value === "adjustment") return "Ajuste"
  if (value === "comparison") return "Comparação"
  return value
}

function getSourceLabel(value: string) {
  return value === "authenticated" ? "Autenticado" : "Landing anônima"
}

export function AdminAIMetricsCard() {
  const [metrics, setMetrics] = useState<AIGenerationMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadMetrics() {
      try {
        const response = await fetch("/api/admin/ai-metrics", { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as ApiResponse | null

        if (!active) {
          return
        }

        if (!response.ok || !payload?.ok) {
          setError((payload && !payload.ok && payload.error) || "Não foi possível carregar as métricas de IA.")
          setMetrics(null)
          return
        }

        setMetrics(payload.data)
        setError(null)
      } catch (loadError) {
        console.error("ADMIN AI METRICS LOAD ERROR", loadError)
        if (!active) {
          return
        }

        setError("Não foi possível carregar as métricas de IA.")
        setMetrics(null)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadMetrics()

    return () => {
      active = false
    }
  }, [])

  return (
    <BrandCard className="p-6">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Bot className="size-5 text-[#004aad]" />
          Observabilidade da IA
        </h2>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
          Carregando métricas de geração...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">{error}</div>
      ) : metrics ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <WandSparkles className="size-4 text-[#004aad]" />
                Total de gerações
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{metrics.totalGenerations}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TriangleAlert className="size-4 text-[#004aad]" />
                Taxa de fallback
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{formatRate(metrics.fallbackRate)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TriangleAlert className="size-4 text-[#004aad]" />
                Taxa de erro
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{formatRate(metrics.errorRate)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4 text-[#004aad]" />
                Tempo médio
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{formatDuration(metrics.averageDurationMs)}</div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-medium text-foreground">Últimas falhas</div>
            <div className="space-y-3">
              {metrics.recentFailures.length === 0 ? (
                <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                  Nenhuma falha recente registrada.
                </div>
              ) : (
                metrics.recentFailures.map((failure) => (
                  <div key={failure.id} className="rounded-2xl border border-border/60 px-4 py-4">
                    <div className="grid gap-3 lg:grid-cols-[0.9fr_0.9fr_1fr_0.6fr] lg:items-center">
                      <div className="text-sm text-muted-foreground">{getGenerationTypeLabel(failure.generationType)}</div>
                      <div className="text-sm text-muted-foreground">{getSourceLabel(failure.source)}</div>
                      <div className="text-sm text-muted-foreground">{failure.openaiError ?? "Falha sem detalhe adicional."}</div>
                      <div className="text-sm text-muted-foreground">{formatShortDate(failure.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </BrandCard>
  )
}
