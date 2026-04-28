"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Plane, Sparkles } from "lucide-react"
import { heroSuggestions } from "@/lib/constants/trip-suggestions"
import { getClientSession } from "@/lib/services/session-service"
import { GradientButton } from "@/components/ui/gradient-button"
import { BrandCard } from "@/components/ui/brand-card"

type AiTripFormProps = {
  placeholder?: string
  defaultValue?: string
  redirectTo?: string
  enforceFreeSearchLimit?: boolean
}

type TripGenerationApiResponse =
  | { ok: true; data: { persisted: boolean; tripId?: string; remainingCredits?: number; result?: unknown } }
  | { ok: false; error: string; code?: string }

const FREE_SEARCH_STORAGE_KEY = "free_search_used"

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || ""
  const rawBody = await response.text()

  if (!rawBody.trim()) {
    return null
  }

  if (!contentType.includes("application/json")) {
    console.error("Expected JSON response but received:", contentType, rawBody)
    return null
  }

  try {
    return JSON.parse(rawBody) as TripGenerationApiResponse
  } catch (error) {
    console.error("Failed to parse trip generation response JSON", error, rawBody)
    return null
  }
}

export function AiTripForm({
  placeholder = "Ex: Quero viajar para Itália com minha família em julho gastando até R$ 5.000",
  defaultValue = "",
  redirectTo = "/resultado",
  enforceFreeSearchLimit = false,
}: AiTripFormProps) {
  const [query, setQuery] = useState(defaultValue)
  const [error, setError] = useState("")
  const [selectedSuggestion, setSelectedSuggestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [freeSearchBlocked, setFreeSearchBlocked] = useState(false)
  const router = useRouter()

  const trimmed = useMemo(() => query.trim(), [query])

  useEffect(() => {
    if (!enforceFreeSearchLimit || typeof window === "undefined") return

    const used = window.localStorage.getItem(FREE_SEARCH_STORAGE_KEY) === "true"
    setFreeSearchBlocked(used)
  }, [enforceFreeSearchLimit])

  async function handleSubmit() {
    if (!trimmed) {
      setError("Descreva sua viagem em uma frase para eu montar a simulação.")
      return
    }

    setIsSubmitting(true)
    setError("")
    const source = selectedSuggestion && trimmed === selectedSuggestion ? "sugestao" : "busca"
    const session = await getClientSession()

    if (!session.isAuthenticated && enforceFreeSearchLimit && freeSearchBlocked) {
      setError("Você já usou sua busca gratuita. Crie uma conta para continuar.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/ai/generate-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: source,
          input: trimmed,
        }),
      })

      const payload = await readJsonResponse(response)

      if (!response.ok || !payload?.ok) {
        const message = payload && !payload.ok ? payload.error : "Não foi possível gerar sua viagem agora. Tente novamente em instantes."
        setError(message)
        return
      }

      if (!session.isAuthenticated && enforceFreeSearchLimit && typeof window !== "undefined") {
        window.localStorage.setItem(FREE_SEARCH_STORAGE_KEY, "true")
        setFreeSearchBlocked(true)
      }

      if (payload.data.tripId) {
        const tripId = payload.data.tripId

        startTransition(() => {
          const separator = redirectTo.includes("?") ? "&" : "?"
          router.push(`${redirectTo}${separator}tripId=${encodeURIComponent(tripId)}`)
        })
        return
      }

      startTransition(() => {
        const separator = redirectTo.includes("?") ? "&" : "?"
        const suggestionParam = source === "sugestao" ? `&suggestion=${encodeURIComponent(selectedSuggestion)}` : ""
        router.push(`${redirectTo}${separator}input=${encodeURIComponent(trimmed)}&source=${source}${suggestionParam}`)
      })
    } catch (submitError) {
      console.error("Failed to submit trip generation", submitError)
      setError("Não foi possível gerar sua viagem agora. Tente novamente em instantes.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const showFreeSearchBlockedActions = enforceFreeSearchLimit && freeSearchBlocked

  return (
    <div className="space-y-4">
      <BrandCard glow className="rounded-[28px] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-4 top-5 size-5 text-[#5de0e6]" />
            <textarea
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (selectedSuggestion && event.target.value !== selectedSuggestion) {
                  setSelectedSuggestion("")
                }
              }}
              placeholder={placeholder}
              rows={3}
              className="min-h-[88px] w-full resize-none rounded-[22px] border border-transparent bg-secondary/40 py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#5de0e6]/50 focus:outline-none"
            />
          </div>
          <GradientButton
            type="button"
            size="lg"
            className="h-auto min-h-[88px] px-6 text-base sm:w-auto"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isPending}
          >
            {isSubmitting || isPending ? (
              <>
                <Plane className="size-5 animate-spin" />
                Gerando sua viagem...
              </>
            ) : (
              <>
                Descobrir viagem
                <ArrowRight className="size-5" />
              </>
            )}
          </GradientButton>
        </div>
      </BrandCard>

      {error ? <p className="px-2 text-sm text-[#004aad]">{error}</p> : null}

      {showFreeSearchBlockedActions ? (
        <div className="flex flex-wrap gap-3 px-2">
          <GradientButton href="/cadastro" size="lg">
            Criar conta
          </GradientButton>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
          >
            Entrar
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-sm text-muted-foreground">Sugestões:</span>
        {heroSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion)
              setSelectedSuggestion(suggestion)
            }}
            className="rounded-full border border-border/60 bg-white/80 px-4 py-2 text-sm text-foreground transition hover:border-[#5de0e6]/70 hover:bg-secondary/70"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
