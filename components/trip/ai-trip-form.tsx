"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Plane, Sparkles } from "lucide-react"
import { heroSuggestions } from "@/lib/constants/trip-suggestions"
import { hasUsedGuestTrip, markGuestTripUsed, saveAnonymousTripResult } from "@/lib/services/guest-trip-service"
import { savePendingTripRequest } from "@/lib/services/pending-trip-service"
import { getClientSession } from "@/lib/services/session-service"
import { sanitizeTripProfileInput } from "@/lib/travel/trip-profile"
import { BrandCard } from "@/components/ui/brand-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type {
  TripResult,
  TripProfileFlightPreference,
  TripProfileInput,
  TripProfilePace,
  TripProfilePreference,
  TripProfilePriceSensitivity,
  TripProfileStyle,
} from "@/types/trip"

type AiTripFormProps = {
  placeholder?: string
  defaultValue?: string
  redirectTo?: string
  enforceFreeSearchLimit?: boolean
  requireAuthBeforeSubmit?: boolean
}

type TripGenerationApiResponse =
  | { ok: true; data: { persisted: boolean; tripId?: string; remainingCredits?: number; result?: unknown } }
  | { ok: false; error: string; code?: string }

const emptyProfile: TripProfileInput = { preferences: [] }

const profileOptions = {
  style: ["familia", "casal", "amigos", "solo", "trabalho", "luxo", "aventura", "relaxamento"] as const,
  pace: ["tranquilo", "equilibrado", "intenso"] as const,
  preferences: ["praia", "natureza", "cultura", "gastronomia", "vida-noturna", "neve-frio", "compras", "parques-atracoes"] as const,
  priceSensitivity: ["economico", "intermediario", "premium"] as const,
  flightPreference: ["voos-curtos", "aceito-conexoes", "evitar-conexoes", "nao-importa"] as const,
}

const profileLabels: Record<
  TripProfileStyle | TripProfilePace | TripProfilePreference | TripProfilePriceSensitivity | TripProfileFlightPreference,
  string
> = {
  familia: "Família",
  casal: "Casal",
  amigos: "Amigos",
  solo: "Solo",
  trabalho: "Trabalho",
  luxo: "Luxo",
  aventura: "Aventura",
  relaxamento: "Relaxamento",
  tranquilo: "Tranquilo",
  equilibrado: "Equilibrado",
  intenso: "Intenso",
  praia: "Praia",
  natureza: "Natureza",
  cultura: "Cultura",
  gastronomia: "Gastronomia",
  "vida-noturna": "Vida noturna",
  "neve-frio": "Neve e frio",
  compras: "Compras",
  "parques-atracoes": "Parques e atrações",
  economico: "Econômico",
  intermediario: "Intermediário",
  premium: "Premium",
  "voos-curtos": "Prefiro voos curtos",
  "aceito-conexoes": "Aceito conexões",
  "evitar-conexoes": "Evitar conexões",
  "nao-importa": "Não importa",
}

function buildProfilePayload(profile: TripProfileInput): TripProfileInput | undefined {
  return sanitizeTripProfileInput(profile)
}

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

function ProfileChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-[#5de0e6] bg-[linear-gradient(135deg,#5de0e614,#004aad14)] text-foreground shadow-sm"
          : "border-border/60 bg-white/80 text-muted-foreground hover:border-[#5de0e6]/50",
      ].join(" ")}
    >
      {label}
    </button>
  )
}

export function AiTripForm({
  placeholder = "Ex: Quero viajar para a Itália com minha família em julho, gastando até R$ 5.000",
  defaultValue = "",
  redirectTo = "/resultado",
  enforceFreeSearchLimit = false,
  requireAuthBeforeSubmit = false,
}: AiTripFormProps) {
  const [query, setQuery] = useState(defaultValue)
  const [profile, setProfile] = useState<TripProfileInput>(emptyProfile)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [error, setError] = useState("")
  const [selectedSuggestion, setSelectedSuggestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [freeSearchBlocked, setFreeSearchBlocked] = useState(() => {
    if (!enforceFreeSearchLimit || typeof window === "undefined") {
      return false
    }

    return hasUsedGuestTrip()
  })
  const router = useRouter()

  const trimmed = useMemo(() => query.trim(), [query])
  const profilePayload = useMemo(() => buildProfilePayload(profile), [profile])

  useEffect(() => {
    if (!enforceFreeSearchLimit || typeof window === "undefined") return

    const syncFreeSearchStatus = () => {
      setFreeSearchBlocked(hasUsedGuestTrip())
    }

    window.addEventListener("storage", syncFreeSearchStatus)

    return () => {
      window.removeEventListener("storage", syncFreeSearchStatus)
    }
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

    if (!session.isAuthenticated && requireAuthBeforeSubmit) {
      savePendingTripRequest({
        flow: "search",
        redirectTo,
        payload: {
          origin: source,
          input: trimmed,
          profile: profilePayload,
        },
      })
      router.push("/login")
      setIsSubmitting(false)
      return
    }

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
          profile: profilePayload,
        }),
      })

      const payload = await readJsonResponse(response)

      if (!response.ok || !payload?.ok) {
        const message = payload && !payload.ok ? payload.error : "Não foi possível gerar sua viagem agora. Tente novamente em instantes."
        setError(message)
        return
      }

      if (!session.isAuthenticated && enforceFreeSearchLimit) {
        markGuestTripUsed()
        setFreeSearchBlocked(true)

        if (payload.data.tripId && payload.data.result) {
          saveAnonymousTripResult({
            tripId: payload.data.tripId,
            source,
            result: payload.data.result as TripResult,
            createdAt: new Date().toISOString(),
          })
        }
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
        <div className="space-y-4">
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

          <Accordion
            type="single"
            collapsible
            value={isProfileOpen ? "travel-profile" : undefined}
            onValueChange={(value) => setIsProfileOpen(value === "travel-profile")}
            className="rounded-[24px] border border-border/60 bg-secondary/20 px-4 sm:px-5"
          >
            <AccordionItem value="travel-profile" className="border-b-0">
              <AccordionTrigger className="items-center py-3.5 text-left hover:no-underline sm:py-4">
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium text-foreground">Perfil opcional da viagem</div>
                  <div className="mt-1 text-sm leading-5 text-muted-foreground">
                    Personalize a recomendação com estilo, ritmo e preferências
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setProfile(emptyProfile)}
                    className="text-left text-xs font-medium text-[#004aad] transition hover:text-[#00357f]"
                  >
                    Limpar preferências
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <div className="mb-3 text-sm font-medium text-foreground">Estilo da viagem</div>
                    <div className="flex flex-wrap gap-2">
                      {profileOptions.style.map((option) => (
                        <ProfileChoiceButton
                          key={option}
                          active={profile.style === option}
                          label={profileLabels[option]}
                          onClick={() =>
                            setProfile((current) => ({
                              ...current,
                              style: current.style === option ? undefined : option,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-medium text-foreground">Ritmo da viagem</div>
                    <div className="flex flex-wrap gap-2">
                      {profileOptions.pace.map((option) => (
                        <ProfileChoiceButton
                          key={option}
                          active={profile.pace === option}
                          label={profileLabels[option]}
                          onClick={() =>
                            setProfile((current) => ({
                              ...current,
                              pace: current.pace === option ? undefined : option,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-medium text-foreground">Preferências</div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {profileOptions.preferences.map((option) => {
                        const checked = profile.preferences?.includes(option) ?? false
                        return (
                          <label
                            key={option}
                            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/80 px-3 py-3 text-sm text-foreground transition hover:border-[#5de0e6]/50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setProfile((current) => {
                                  const currentPreferences = current.preferences ?? []
                                  return {
                                    ...current,
                                    preferences: checked
                                      ? currentPreferences.filter((item) => item !== option)
                                      : [...currentPreferences, option],
                                  }
                                })
                              }
                              className="size-4 rounded border-border/60 text-[#004aad] focus:ring-[#5de0e6]/50"
                            />
                            <span>{profileLabels[option]}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <div className="mb-3 text-sm font-medium text-foreground">Sensibilidade a preço</div>
                      <div className="flex flex-wrap gap-2">
                        {profileOptions.priceSensitivity.map((option) => (
                          <ProfileChoiceButton
                            key={option}
                            active={profile.priceSensitivity === option}
                            label={profileLabels[option]}
                            onClick={() =>
                              setProfile((current) => ({
                                ...current,
                                priceSensitivity: current.priceSensitivity === option ? undefined : option,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-medium text-foreground">Preferência de voo</div>
                      <div className="flex flex-wrap gap-2">
                        {profileOptions.flightPreference.map((option) => (
                          <ProfileChoiceButton
                            key={option}
                            active={profile.flightPreference === option}
                            label={profileLabels[option]}
                            onClick={() =>
                              setProfile((current) => ({
                                ...current,
                                flightPreference: current.flightPreference === option ? undefined : option,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
