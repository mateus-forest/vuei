"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import { savePendingTripRequest } from "@/lib/services/pending-trip-service"
import { getClientSession } from "@/lib/services/session-service"
import { GradientButton } from "@/components/ui/gradient-button"
import { BrandCard } from "@/components/ui/brand-card"
import type { QuizAnswer } from "@/types/trip"

const options = {
  tripStyle: ["solo", "romantica", "familia", "aventura", "descanso", "luxo", "cultural"] as const,
  budget: ["ate-3000", "ate-5000", "ate-8000", "acima-8000"] as const,
  duration: ["fim-de-semana", "4-6-dias", "7-10-dias", "11+-dias"] as const,
  region: ["brasil", "internacional"] as const,
  vibe: ["praia", "inverno", "verao", "cultura", "natureza", "luxo"] as const,
}

const labels: Record<string, string> = {
  solo: "Solo",
  romantica: "Romântica",
  familia: "Família",
  aventura: "Aventura",
  descanso: "Descanso",
  luxo: "Luxo",
  cultural: "Cultural",
  "ate-3000": "Até R$ 3 mil",
  "ate-5000": "Até R$ 5 mil",
  "ate-8000": "Até R$ 8 mil",
  "acima-8000": "Acima de R$ 8 mil",
  "fim-de-semana": "Fim de semana",
  "4-6-dias": "4 a 6 dias",
  "7-10-dias": "7 a 10 dias",
  "11+-dias": "11+ dias",
  brasil: "Brasil",
  internacional: "Internacional",
  praia: "Praia",
  inverno: "Inverno",
  verao: "Verão",
  cultura: "Cultura",
  natureza: "Natureza",
}

const defaultAnswers: QuizAnswer = {
  tripStyle: "descanso",
  budget: "ate-5000",
  duration: "4-6-dias",
  region: "brasil",
  vibe: "praia",
}

type TripGenerationApiResponse =
  | { ok: true; data: { persisted: boolean; tripId?: string; remainingCredits?: number; result?: unknown } }
  | { ok: false; error: string; code?: string }

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
    console.error("Failed to parse quiz trip generation response JSON", error, rawBody)
    return null
  }
}

export function QuizForm({
  redirectTo = "/resultado",
  requireAuthBeforeSubmit = false,
}: {
  redirectTo?: string
  requireAuthBeforeSubmit?: boolean
}) {
  const [answers, setAnswers] = useState<QuizAnswer>(defaultAnswers)
  const [familyCounts, setFamilyCounts] = useState({ adults: "2", children: "0" })
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function updateAnswer<K extends keyof QuizAnswer>(key: K, value: QuizAnswer[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setError("")
    const payload = new URLSearchParams(answers).toString()
    const session = await getClientSession()

    if (!session.isAuthenticated && requireAuthBeforeSubmit) {
      savePendingTripRequest({
        flow: "quiz",
        redirectTo,
        payload: {
          origin: "quiz",
          quizAnswers: answers,
        },
      })
      router.push("/login")
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
          origin: "quiz",
          quizAnswers: answers,
        }),
      })

      const result = await readJsonResponse(response)

      if (!response.ok || !result?.ok) {
        const message = result && !result.ok ? result.error : "Não foi possível gerar sua viagem agora. Tente novamente em instantes."
        setError(message)
        return
      }

      if (result.data.tripId) {
        const tripId = result.data.tripId

        startTransition(() => {
          const separator = redirectTo.includes("?") ? "&" : "?"
          router.push(`${redirectTo}${separator}tripId=${encodeURIComponent(tripId)}`)
        })
        return
      }

      startTransition(() => {
        const separator = redirectTo.includes("?") ? "&" : "?"
        router.push(`${redirectTo}${separator}source=quiz&${payload}`)
      })
    } catch (fetchError) {
      console.error("Failed to submit quiz trip generation", fetchError)
      setError("Não foi possível gerar sua viagem agora. Tente novamente em instantes.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BrandCard glow className="p-6 sm:p-8">
      <div className="space-y-8">
        <QuizRow
          label="Estilo da viagem"
          values={options.tripStyle}
          selected={answers.tripStyle}
          onSelect={(value) => updateAnswer("tripStyle", value)}
        />
        {answers.tripStyle === "familia" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Número de adultos</span>
              <input
                type="number"
                min="1"
                value={familyCounts.adults}
                onChange={(event) => setFamilyCounts((current) => ({ ...current, adults: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Número de crianças</span>
              <input
                type="number"
                min="0"
                value={familyCounts.children}
                onChange={(event) => setFamilyCounts((current) => ({ ...current, children: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
              />
            </label>
          </div>
        ) : null}
        <QuizRow
          label="Orçamento"
          values={options.budget}
          selected={answers.budget}
          onSelect={(value) => updateAnswer("budget", value)}
        />
        <QuizRow
          label="Duração"
          values={options.duration}
          selected={answers.duration}
          onSelect={(value) => updateAnswer("duration", value)}
        />
        <QuizRow
          label="Região da viagem"
          values={options.region}
          selected={answers.region}
          onSelect={(value) => updateAnswer("region", value)}
        />
        <QuizRow
          label="Vibe principal"
          values={options.vibe}
          selected={answers.vibe}
          onSelect={(value) => updateAnswer("vibe", value)}
        />

        <GradientButton size="lg" className="w-full" onClick={() => void handleSubmit()} disabled={isSubmitting || isPending}>
          <Sparkles className="size-5" />
          {isSubmitting || isPending ? "Gerando sua viagem..." : "Ver sugestão agora"}
          <ArrowRight className="size-5" />
        </GradientButton>

        {error ? <p className="text-sm text-[#004aad]">{error}</p> : null}
      </div>
    </BrandCard>
  )
}

function QuizRow<T extends string>({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string
  values: readonly T[]
  selected: T
  onSelect: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-3">
        {values.map((value) => {
          const active = selected === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={[
                "rounded-full border px-4 py-2 text-sm transition",
                active
                  ? "border-[#5de0e6] bg-[linear-gradient(135deg,#5de0e614,#004aad14)] text-foreground shadow-sm"
                  : "border-border/60 bg-white/80 text-muted-foreground hover:border-[#5de0e6]/50",
              ].join(" ")}
            >
              {labels[value]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
