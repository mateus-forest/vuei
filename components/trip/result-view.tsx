"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { type ReactNode, useMemo, useRef, useState } from "react"
import { ArrowLeftRight, Compass, CreditCard, Download, Map, Sparkles, Wallet } from "lucide-react"
import { ItineraryPdfTemplate } from "@/components/trip/itinerary-pdf-template"
import { BrandCard } from "@/components/ui/brand-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { savePostAuthRedirect } from "@/lib/services/post-auth-redirect-service"
import type { TripItineraryDay, TripResult } from "@/types/trip"
import { cn } from "@/lib/utils"

type VariantId = "economico" | "intermediario" | "premium"
type ScoreLabelType = "compatibility" | "cost" | "climate" | "crowd" | "route"

type DayPeriodPlan = {
  title: string
  morning: string
  afternoon: string
  evening: string
  tips: string[]
}

type TripVariant = {
  id: VariantId
  title: string
  total: number
  insight: string
  breakdown: Array<{ label: string; value: number }>
  result: TripResult
  periodItinerary: DayPeriodPlan[]
  detailedItinerary: TripItineraryDay[]
}

type CompleteTripSummary = {
  destination: string
  periodLabel: string
  isSuggestedPeriod: boolean
  periodReason: string
  startDate?: string
  endDate?: string
  durationLabel: string
  durationDays: number
  travelersLabel: string
  travelersCount: number
  selectedVariantLabel: string
  estimatedCost: string
  costPerPerson: string
  currency: "BRL"
  breakdown: Array<{ label: string; total: string; perPerson: string }>
  assumptions: string
  shortItinerary: string[]
  fullItinerary: Array<{ title: string; description: string; tips: string[] }>
  insights: string[]
  whyThisTrip: string[]
  attentionPoints: string[]
  summary: string
}

function mapVariantTypeToId(value?: TripResult["selectedVariantType"]): VariantId {
  if (value === "economic") return "economico"
  if (value === "premium") return "premium"
  return "intermediario"
}

function InlineBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  )
}

function buildDetailedItinerary(result: TripResult) {
  if (result.detailedItinerary?.length) {
    return result.detailedItinerary.map(
      (day) =>
        `${day.title}. Manhã: ${day.morning} Tarde: ${day.afternoon} Noite: ${day.evening}${day.tips.length ? ` Dicas: ${day.tips.join("; ")}` : ""}`,
    )
  }

  return (
    result.fullItinerary ??
    result.itinerary.map((day, index) => {
      const complements = [
        `Organize a chegada, os deslocamentos principais e um primeiro contato com ${result.destination}.`,
        "Reserve este período para aproveitar a experiência central da viagem com mais calma e menos correria.",
        "Use o dia para incluir um passeio complementar e manter o ritmo da viagem leve.",
        "Feche o roteiro com tempo para compras, gastronomia local ou retorno sem pressa.",
      ]

      return `${day}. ${complements[index] ?? result.context}`
    })
  )
}

function parsePrice(value: string) {
  const parsed = Number(value.replace(/[^\d,]/g, "").replace(".", "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function inferTravelers(bestFor: string) {
  const normalized = bestFor.toLowerCase()

  if (normalized.includes("solo")) return 1
  if (normalized.includes("fam")) return 3
  if (normalized.includes("casal") || normalized.includes("dupla")) return 2
  return 2
}

function formatTravelerLabel(count: number) {
  return count === 1 ? "1 pessoa" : `${count} pessoas`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function roundCurrency(value: number) {
  return Math.max(300, Math.round(value / 50) * 50)
}

function buildBreakdown(total: number, tier: VariantId) {
  const ratios =
    tier === "economico"
      ? [0.32, 0.28, 0.16, 0.1, 0.14]
      : tier === "premium"
        ? [0.28, 0.36, 0.14, 0.08, 0.14]
        : [0.3, 0.32, 0.15, 0.09, 0.14]

  const labels = ["Passagens", "Hospedagem", "Alimentação", "Transporte", "Passeios"]
  const values = ratios.map((ratio) => roundCurrency(total * ratio))
  const adjustment = total - values.reduce((sum, value) => sum + value, 0)
  values[1] += adjustment

  return labels.map((label, index) => ({
    label,
    value: values[index],
  }))
}

function buildPeriodItinerary(result: TripResult, detailedItinerary: string[], variantId: VariantId): DayPeriodPlan[] {
  if (result.detailedItinerary?.length) {
    return result.detailedItinerary.map((day, index) => ({
      title: day.title || `Dia ${index + 1}`,
      morning: day.morning,
      afternoon: day.afternoon,
      evening: day.evening,
      tips: day.tips,
    }))
  }

  const momentsByVariant: Record<VariantId, { morning: string; afternoon: string; night: string }> = {
    economico: {
      morning: `Comece o dia em ${result.destination} com deslocamentos práticos e agenda objetiva.`,
      afternoon: "Priorize o passeio central do destino com logística simplificada e boas paradas.",
      night: "Finalize com jantar em área acessível e ritmo mais enxuto para controlar custos.",
    },
    intermediario: {
      morning: `Inicie o dia em ${result.destination} com agenda equilibrada e tempo para explorar com calma.`,
      afternoon: "Aproveite a experiência principal do destino com deslocamentos confortáveis e pausas bem distribuídas.",
      night: "Feche o dia com boa gastronomia local e uma noite leve para manter o ritmo da viagem.",
    },
    premium: {
      morning: `Comece o dia em ${result.destination} com mais conforto, deslocamentos suaves e experiência bem organizada.`,
      afternoon: "Aprofunde os passeios principais com mais conveniência, tempo de pausa e agenda fluida.",
      night: "Encerramento com jantar especial, caminhada agradável ou experiência noturna mais refinada.",
    },
  }

  return detailedItinerary.map((description, index) => {
    const title = result.itinerary[index] ?? `Dia ${index + 1}`
    const moments = momentsByVariant[variantId]

    return {
      title,
      morning: moments.morning,
      afternoon: `${moments.afternoon} ${description}`.trim(),
      evening: moments.night,
      tips: [],
    }
  })
}

function buildTripVariants(result: TripResult, currentCost: number) {
  const safeBaseCost = Math.max(currentCost, 1800)
  const baseDetailedItinerary = buildDetailedItinerary(result)
  const variantLabels: Record<VariantId, string> = {
    economico: "Econômico",
    intermediario: "Intermediário",
    premium: "Premium",
  }
  const fallbackVariants: Array<{
    id: VariantId
    title: string
    total: number
    insight: string
    itinerary: string[]
    detailedItinerary?: TripItineraryDay[]
    breakdown?: Array<{ label: string; value: number }>
  }> = [
    {
      id: "economico",
      title: variantLabels.economico,
      total: roundCurrency(Math.max(safeBaseCost - 1200, 1200)),
      insight:
        "Prioriza o essencial da viagem com hospedagem mais enxuta, logística simples e custo menor para comparar com clareza.",
      itinerary: result.itinerary,
      detailedItinerary: result.detailedItinerary,
    },
    {
      id: "intermediario",
      title: variantLabels.intermediario,
      total: roundCurrency(safeBaseCost),
      insight:
        "Equilibra conforto, localização e experiências centrais sem elevar demais o investimento total da viagem.",
      itinerary: result.itinerary,
      detailedItinerary: result.detailedItinerary,
    },
    {
      id: "premium",
      title: variantLabels.premium,
      total: roundCurrency(Math.min(safeBaseCost + 2200, 18000)),
      insight:
        "Aumenta conforto e conveniência com hospedagem melhor localizada, deslocamentos mais fluidos e agenda mais completa.",
      itinerary: result.itinerary,
      detailedItinerary: result.detailedItinerary,
    },
  ]

  const backendVariants: Array<{
    id: VariantId
    source:
      | NonNullable<TripResult["variants"]>[number]
      | undefined
  }> =
    result.variants?.length === 3
      ? [
          { id: "economico", source: result.variants.find((variant) => variant.type === "economic") },
          { id: "intermediario", source: result.variants.find((variant) => variant.type === "intermediate") },
          { id: "premium", source: result.variants.find((variant) => variant.type === "premium") },
        ]
      : []

  const completeBackendVariants = backendVariants.filter(
    (
      variant,
    ): variant is {
      id: VariantId
      source: NonNullable<TripResult["variants"]>[number]
    } => Boolean(variant.source),
  )

  const variants = completeBackendVariants.length === 3
    ? completeBackendVariants.map((variant) => ({
        id: variant.id,
        title: variantLabels[variant.id],
        total: variant.source.totalCost,
        insight: variant.source.assumptions?.trim() || result.context,
        itinerary: variant.source.itinerary,
        detailedItinerary: variant.source.detailedItinerary,
        breakdown: [
          { label: "Passagens", value: variant.source.breakdown.flights },
          { label: "Hospedagem", value: variant.source.breakdown.lodging },
          { label: "Alimentação", value: variant.source.breakdown.food },
          { label: "Transporte", value: variant.source.breakdown.localTransport },
          { label: "Passeios", value: variant.source.breakdown.activities },
        ],
      }))
    : fallbackVariants

  return variants.map((variant): TripVariant => {
    const resultForItinerary: TripResult = {
      ...result,
      itinerary: variant.itinerary,
      detailedItinerary: variant.detailedItinerary,
    }
    const periodItinerary = buildPeriodItinerary(resultForItinerary, baseDetailedItinerary, variant.id)
    const tipsByVariant: Record<VariantId, string[]> = {
      economico: [
        "Hospedagens econômicas em áreas bem conectadas ajudam a controlar o orçamento.",
        "Concentrar passeios principais reduz deslocamentos e gastos extras.",
        "Viajar fora da alta temporada costuma melhorar bastante o custo-benefício.",
      ],
      intermediario: [
        "Um roteiro equilibrado combina boa localização, conforto e agenda sem correria.",
        "Reservar com antecedência ajuda a manter o custo previsível.",
        "Vale ajustar os dias centrais para encaixar experiências mais completas.",
      ],
      premium: [
        "Hospedagens centrais e deslocamentos mais confortáveis aumentam a fluidez da viagem.",
        "Reservar experiências concorridas antes da viagem melhora a disponibilidade.",
        "Um roteiro com pausas maiores deixa a experiencia mais agradavel e sofisticada.",
      ],
    }

    const summaryByVariant: Record<VariantId, string> = {
      economico: "Versão mais enxuta da viagem, priorizando boa experiência com orçamento controlado.",
      intermediario: "Versão equilibrada da viagem, combinando conforto, praticidade e experiências centrais.",
      premium: "Versão mais completa da viagem, com mais conforto, ritmo fluido e melhor conveniência.",
    }

    const resultForVariant: TripResult = {
      ...result,
      itinerary: variant.itinerary,
      detailedItinerary: variant.detailedItinerary,
      estimatedCost: formatPrice(variant.total),
      summary: summaryByVariant[variant.id],
      context: variant.insight,
      tips: tipsByVariant[variant.id],
      fullItinerary: periodItinerary.map(
        (day) =>
          `${day.title}. Manhã: ${day.morning} Tarde: ${day.afternoon} Noite: ${day.evening}${day.tips.length ? ` Dicas: ${day.tips.join("; ")}` : ""}`,
      ),
    }

    return {
      ...variant,
      breakdown: variant.breakdown ?? buildBreakdown(variant.total, variant.id),
      result: resultForVariant,
      periodItinerary,
      detailedItinerary: variant.detailedItinerary ?? result.detailedItinerary ?? [],
    }
  })
}

function getScoreLabel(type: ScoreLabelType, score: number) {
  if (type === "compatibility") {
    if (score <= 39) return "Baixa"
    if (score <= 69) return "Boa"
    return "Alta"
  }

  if (type === "cost") {
    if (score <= 30) return "Caro"
    if (score <= 60) return "Razoável"
    return "Econômico"
  }

  if (type === "climate") {
    if (score <= 39) return "Desfavorável"
    if (score <= 69) return "Ok"
    return "Bom"
  }

  if (type === "crowd") {
    if (score <= 30) return "Tranquila"
    if (score <= 70) return "Moderada"
    return "Alta"
  }

  if (score <= 39) return "Cansativa"
  if (score <= 69) return "Boa"
  return "Confortável"
}

function formatDateDisplay(value?: string) {
  if (!value?.trim()) return ""

  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-")
    return `${day}/${month}/${year}`
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime()) && /\d{4}/.test(trimmed)) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed)
  }

  return trimmed
}

function formatPeriodDisplay(result: TripResult) {
  if (result.startDate && result.endDate) {
    return `${formatDateDisplay(result.startDate)} a ${formatDateDisplay(result.endDate)}`
  }

  if (result.periodLabel?.trim()) {
    return result.periodLabel.trim()
  }

  if (result.startDate?.trim()) {
    return formatDateDisplay(result.startDate)
  }

  return "Período não informado"
}

function formatDurationDisplay(result: TripResult, fallbackDays: number) {
  if (result.durationLabel?.trim()) return result.durationLabel.trim()
  if (result.durationDays && result.durationDays > 0) return `${result.durationDays} ${result.durationDays === 1 ? "dia" : "dias"}`
  return `${fallbackDays} ${fallbackDays === 1 ? "dia" : "dias"}`
}

function getSelectedVariantLabel(variantId: VariantId) {
  if (variantId === "economico") return "Econômico"
  if (variantId === "premium") return "Premium"
  return "Intermediário"
}

function buildOriginSubtitle(source: string, suggestion: string, input: string) {
  if (source === "quiz") {
    return "Baseado nas suas respostas do quiz"
  }

  if (source === "suggestion" && suggestion) {
    return `Baseado na sugestão escolhida: ${suggestion}`
  }

  return `Baseado na sua busca: ${input}`
}

function buildCompleteTripSummary({
  result,
  variant,
  travelersCount,
  durationDays,
  periodLabel,
}: {
  result: TripResult
  variant: TripVariant
  travelersCount: number
  durationDays: number
  periodLabel: string
}): CompleteTripSummary {
  const fullItinerarySource =
    variant.periodItinerary.length > 0
      ? variant.periodItinerary.map((day, index) => ({
          title: day.title || `Dia ${index + 1}`,
          description: [`Manhã: ${day.morning}`, `Tarde: ${day.afternoon}`, `Noite: ${day.evening}`].join(" "),
          tips: day.tips,
        }))
      : (result.fullItinerary ?? buildDetailedItinerary(result)).filter(Boolean).map((day, index) => ({
          title: result.itinerary[index] ?? `Dia ${index + 1}`,
          description: day,
          tips: [],
        }))

  const whyThisTrip = [
    result.intelligence?.explanation?.summary,
    result.intelligence?.explanation?.strongestPoint,
    ...(result.intelligence?.explanation?.reasons ?? []),
  ].filter(Boolean) as string[]

  const attentionPoints = [
    result.intelligence?.explanation?.attentionPoint,
    ...(result.intelligence?.explanation?.warnings ?? []),
    "Os valores são estimativas e podem variar conforme disponibilidade, câmbio, antecedência e período.",
  ].filter(Boolean) as string[]

  return {
    destination: result.destination || "Destino sugerido",
    periodLabel,
    isSuggestedPeriod: result.isSuggestedPeriod ?? false,
    periodReason: result.periodReason?.trim() || "Período ainda não definido para a viagem.",
    startDate: result.startDate ? formatDateDisplay(result.startDate) : undefined,
    endDate: result.endDate ? formatDateDisplay(result.endDate) : undefined,
    durationLabel: formatDurationDisplay(result, durationDays),
    durationDays: result.durationDays ?? durationDays,
    travelersLabel: formatTravelerLabel(travelersCount),
    travelersCount,
    selectedVariantLabel: variant.title,
    estimatedCost: result.estimatedCost || "R$ 0",
    costPerPerson: formatPrice(Math.max(300, Math.round(parsePrice(result.estimatedCost || "0") / Math.max(1, travelersCount)))),
    currency: "BRL",
    breakdown: variant.breakdown.map((item) => ({
      label: item.label,
      total: formatPrice(item.value),
      perPerson: formatPrice(Math.max(100, Math.round(item.value / Math.max(1, travelersCount)))),
    })),
    assumptions: result.context?.trim() || variant.insight,
    shortItinerary: result.itinerary.filter(Boolean),
    fullItinerary: fullItinerarySource,
    insights: (result.tips ?? []).filter(Boolean),
    whyThisTrip,
    attentionPoints,
    summary: result.summary?.trim() || "Encontramos uma sugestão pronta para comparar melhor custo, ritmo e conforto.",
  }
}

function getConfidenceText(confidence?: "high" | "medium" | "low") {
  if (confidence === "high") {
    return "Usamos dados mais especificos para esse destino, deixando a leitura mais precisa."
  }

  if (confidence === "medium") {
    return "Combinamos dados do destino com estimativas seguras para manter a recomendacao confiavel."
  }

  if (confidence === "low") {
    return "A recomendação foi completada com heurísticas regionais para não travar sua experiência."
  }

  return ""
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="text-xs uppercase tracking-[0.14em] text-[#004aad]/65">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function ExpandableSection({
  value,
  title,
  children,
}: {
  value: string
  title: string
  children: ReactNode
}) {
  return (
    <AccordionItem value={value} className="rounded-[24px] border border-border/60 bg-white/80 px-4 last:border-b">
      <AccordionTrigger className="py-4 text-left text-base font-semibold text-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-4">{children}</AccordionContent>
    </AccordionItem>
  )
}

function IntelligenceMetricCard({
  title,
  score,
  label,
}: {
  title: string
  score?: number
  label?: string
}) {
  if (typeof score !== "number") {
    return null
  }

  return (
    <div className="rounded-[22px] border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-3 text-lg font-semibold text-foreground">{label ?? "Analisado"}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Score {score}/100</div>
    </div>
  )
}

function CostDetails({
  value,
  breakdown,
  travelersCount,
  showDetails = true,
}: {
  value: string
  breakdown: Array<{ label: string; value: number }>
  travelersCount: number
  showDetails?: boolean
}) {
  if (!showDetails) {
    return null
  }

  return (
    <Accordion type="single" collapsible className="mt-3">
      <AccordionItem value={value} className="rounded-2xl border border-border/60 bg-white/70 px-3 last:border-b">
        <AccordionTrigger className="py-3 text-sm font-medium text-foreground hover:no-underline">
          Ver detalhes do custo
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-2">
            {breakdown.map((item) => (
              <div key={`${value}-${item.label}`} className="flex items-start justify-between gap-3 rounded-2xl bg-secondary/35 px-3 py-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-right font-medium text-foreground">
                  {formatPrice(item.value)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {formatPrice(Math.max(100, Math.round(item.value / travelersCount)))} por pessoa
                  </span>
                </span>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function VariantSelectorCard({
  variant,
  isSelected,
  travelersCount,
  onSelect,
  showCostDetails = true,
}: {
  variant: TripVariant
  isSelected: boolean
  travelersCount: number
  onSelect: () => void
  showCostDetails?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-4 transition",
        isSelected
          ? "border-[#5de0e6] bg-[linear-gradient(135deg,#5de0e614,#004aad14)] shadow-sm"
          : "border-border/60 bg-secondary/20",
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">{variant.title}</div>
          {isSelected ? (
            <span className="rounded-full bg-[#004aad] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white">
              Selecionado
            </span>
          ) : null}
        </div>

        <div className="mt-3 text-2xl font-semibold text-foreground">{formatPrice(variant.total)}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {formatPrice(Math.max(300, Math.round(variant.total / travelersCount)))} por pessoa
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{variant.insight}</p>
      </button>

      <CostDetails value={`cost-${variant.id}`} breakdown={variant.breakdown} travelersCount={travelersCount} showDetails={showCostDetails} />
    </div>
  )
}

export function ResultView({
  result,
  input,
  loggedIn = false,
  source = "text",
  suggestion = "",
}: {
  result: TripResult
  input: string
  loggedIn?: boolean
  source?: string
  suggestion?: string
}) {
  const [currentResult, setCurrentResult] = useState(result)
  const [selectedVariant, setSelectedVariant] = useState<VariantId>(() => mapVariantTypeToId(result.selectedVariantType))
  const [isCheaperOpen, setIsCheaperOpen] = useState(false)
  const [isAlternativesOpen, setIsAlternativesOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isGeneratingFullItinerary, setIsGeneratingFullItinerary] = useState(false)
  const [actionError, setActionError] = useState("")
  const [adjustForm, setAdjustForm] = useState({
    budget: "R$ 4.500",
    duration: "5 dias",
    style: "Equilibrada",
    period: "Julho",
  })
  const pdfTemplateRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentResultPath = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])
  const currentTripId = searchParams.get("tripId") ?? ""
  const isAnonymousPreview =
    !loggedIn && (currentResult.isAnonymousPreview ?? currentResult.requiresAuthForActions ?? currentResult.resultType === "preview")
  const hasFullItineraryGenerated =
    Boolean(currentResult.generatedSections?.fullItinerary) ||
    Boolean(currentResult.detailedItinerary?.length) ||
    Boolean(currentResult.fullItinerary?.length)
  const authContinuationHref = `/login?next=${encodeURIComponent(currentResultPath)}`

  function redirectToAuthForAction() {
    savePostAuthRedirect(currentResultPath)
    window.location.assign(authContinuationHref)
  }

  async function handleGenerateFullItinerary() {
    if (isAnonymousPreview) {
      redirectToAuthForAction()
      return
    }

    if (!loggedIn || !currentTripId || hasFullItineraryGenerated) {
      return
    }

    setIsGeneratingFullItinerary(true)
    setActionError("")

    try {
      const response = await fetch(`/api/searches/${encodeURIComponent(currentTripId)}/full-itinerary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: { result: TripResult } }
        | { ok: false; error: string }
        | null

      if (!response.ok || !payload?.ok) {
        setActionError((payload && !payload.ok && payload.error) || "Não foi possível gerar o roteiro completo agora.")
        return
      }

      setCurrentResult(payload.data.result)
      setSelectedVariant(mapVariantTypeToId(payload.data.result.selectedVariantType))
    } catch (error) {
      console.error("Failed to generate full itinerary", error)
      setActionError("Não foi possível gerar o roteiro completo agora.")
    } finally {
      setIsGeneratingFullItinerary(false)
    }
  }

  const baseCost = parsePrice(currentResult.estimatedCost)
  const tripVariants = useMemo(() => buildTripVariants(currentResult, baseCost), [currentResult, baseCost])
  const activeVariant = tripVariants.find((variant) => variant.id === selectedVariant) ?? tripVariants[1] ?? tripVariants[0]
  const activeResult = activeVariant.result
  const activePeriodItinerary = activeVariant.periodItinerary.filter(
    (item) => item.title || item.morning || item.afternoon || item.evening,
  )
  const activeDetailedItinerary = (activeResult.fullItinerary ?? buildDetailedItinerary(activeResult)).filter(Boolean)
  const activeCost = parsePrice(activeResult.estimatedCost)
  const travelersCount = Math.max(1, activeResult.travelers ?? inferTravelers(activeResult.bestFor))
  const daysCount = Math.max(activeResult.durationDays ?? 0, activePeriodItinerary.length, activeResult.itinerary.length, 1)
  const costPerTraveler = Math.max(300, Math.round(activeCost / travelersCount))
  const tripPeriodText = formatPeriodDisplay(activeResult)
  const durationText = formatDurationDisplay(activeResult, daysCount)
  const intelligence = activeResult.intelligence
  const intelligenceReasons = (intelligence?.explanation?.reasons ?? []).filter(Boolean)
  const intelligenceWarnings = (intelligence?.explanation?.warnings ?? []).filter(Boolean)
  const summaryText = activeResult.summary?.trim() || "Encontramos uma sugestão pronta para comparar melhor custo, ritmo e conforto."
  const contextText = activeResult.context?.trim() || "A opção escolhida equilibra custo, experiência e praticidade para a viagem."
  const bestForText = activeResult.bestFor?.trim() || "viagem flexível"
  const completeTripSummary = useMemo(
    () =>
      buildCompleteTripSummary({
        result: activeResult,
        variant: activeVariant,
        travelersCount,
        durationDays: daysCount,
        periodLabel: tripPeriodText,
      }),
    [activeResult, activeVariant, travelersCount, daysCount, tripPeriodText],
  )

  const originSubtitle = buildOriginSubtitle(source, suggestion, input)

  const cheaperOption = {
    destination: activeResult.cheapestAlternative ?? `${activeResult.destination} Essencial`,
    estimatedCost: formatPrice(Math.max(activeCost - 900, 1800)),
    reason: "Mantém a proposta principal da viagem, com custo menor, hospedagem mais enxuta e deslocamentos simplificados.",
  }

  const alternatives = [
    {
      destination: activeResult.cheapestAlternative ?? "Porto",
      estimatedCost: formatPrice(Math.max(activeCost - 700, 1900)),
      reason: "Alternativa com melhor custo-benefício e logística simples.",
    },
    {
      destination: `${activeResult.destination} Panorama`,
      estimatedCost: formatPrice(Math.max(activeCost + 200, 2200)),
      reason: "Variação próxima da ideia original, com experiência parecida e ajuste leve de custo.",
    },
    {
      destination: `${activeResult.destination} Compacto`,
      estimatedCost: formatPrice(Math.max(activeCost - 400, 2000)),
      reason: "Opção enxuta para manter a viagem viável sem se distanciar da proposta inicial.",
    },
  ]

  async function handleDownload() {
    if (isAnonymousPreview) {
      redirectToAuthForAction()
      return
    }

    if (!hasFullItineraryGenerated) {
      return
    }

    if (!pdfTemplateRef.current) return

    setActionError("")

    try {
      const html2pdf = (await import("html2pdf.js")).default

      await html2pdf()
        .set({
          margin: 0,
          filename: `roteiro-vuei-${slugify(activeResult.destination) || "destino"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            onclone: (clonedDocument: Document) => {
              const safeColors: Array<[string, string]> = [
                ["--background", "#ffffff"],
                ["--foreground", "#17324d"],
                ["--card", "#ffffff"],
                ["--card-foreground", "#17324d"],
                ["--popover", "#ffffff"],
                ["--popover-foreground", "#17324d"],
                ["--primary", "#004aad"],
                ["--primary-foreground", "#ffffff"],
                ["--secondary", "#f7fafc"],
                ["--secondary-foreground", "#253b56"],
                ["--muted", "#f8fafc"],
                ["--muted-foreground", "#42566f"],
                ["--accent", "#eaf8ff"],
                ["--accent-foreground", "#15324f"],
                ["--border", "#e3ebf4"],
                ["--input", "#e3ebf4"],
                ["--ring", "rgba(0,0,0,0)"],
                ["--sidebar", "#ffffff"],
                ["--sidebar-foreground", "#17324d"],
                ["--sidebar-primary", "#004aad"],
                ["--sidebar-primary-foreground", "#ffffff"],
                ["--sidebar-accent", "#f7fafc"],
                ["--sidebar-accent-foreground", "#17324d"],
                ["--sidebar-border", "#e3ebf4"],
                ["--sidebar-ring", "rgba(0,0,0,0)"],
              ]
              const targets = [
                clonedDocument.documentElement,
                clonedDocument.body,
                clonedDocument.querySelector('[data-pdf-root="true"]'),
              ].filter(Boolean) as HTMLElement[]

              targets.forEach((target) => {
                safeColors.forEach(([property, value]) => {
                  target.style.setProperty(property, value)
                })
                target.style.setProperty("background-color", "#ffffff")
                target.style.setProperty("color", "#17324d")
                target.style.setProperty("border-color", "#e3ebf4")
                target.style.setProperty("outline-color", "rgba(0,0,0,0)")
              })
            },
          },
          jsPDF: {
            unit: "pt",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [
              '[data-pdf-section="meta"]',
              '[data-pdf-section="resumo-da-viagem"]',
              '[data-pdf-section="roteiro-resumido"]',
              '[data-pdf-section="insights-da-opção-escolhida"]',
              '[data-pdf-section="por-que-essa-viagem-faz-sentido"]',
              '[data-pdf-section="pontos-de-atenção"]',
              '[data-pdf-section="observações-finais"]',
              '[data-pdf-keep="true"]',
              '[data-pdf-day="true"]',
            ],
          },
        })
        .from(pdfTemplateRef.current)
        .save()
    } catch (error) {
      console.error("Failed to download trip PDF", error)
      setActionError("Não foi possível iniciar o download. Se estiver no celular, tente abrir pelo navegador.")
    }
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-5">
          <BrandCard glow className="p-5 sm:p-6">
            <InlineBadge>
              <Compass className="size-4 text-[#5de0e6]" />
              {isAnonymousPreview ? "Resultado inicial grátis" : "Sugestão principal"}
            </InlineBadge>

            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.16em] text-[#004aad]/65">Destino sugerido</p>
                <h2 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">{activeResult.destination || "Destino sugerido"}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{summaryText}</p>
                <p className="mt-2 text-sm text-muted-foreground">{originSubtitle}</p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-[360px]">
                <SummaryStat label="Custo estimado principal" value={activeResult.estimatedCost || "R$ 0"} />
                <SummaryStat label="Versão selecionada" value={getSelectedVariantLabel(selectedVariant)} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStat label={completeTripSummary.isSuggestedPeriod ? "Período recomendado" : "Período informado"} value={tripPeriodText} />
              <SummaryStat label="Duração" value={durationText} />
              <SummaryStat label="Pessoas" value={formatTravelerLabel(travelersCount)} />
              <SummaryStat label="Por pessoa" value={formatPrice(costPerTraveler)} />
            </div>

            <div className="mt-3 rounded-[20px] border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              {completeTripSummary.isSuggestedPeriod
                ? completeTripSummary.periodReason
                : `Período preservado a partir da busca. ${completeTripSummary.periodReason}`}
            </div>

            {isAnonymousPreview ? (
              <div className="mt-3 rounded-[20px] border border-[#5de0e6]/35 bg-[linear-gradient(135deg,#5de0e60f,#004aad10)] px-4 py-3 text-sm text-muted-foreground">
                Esse é seu resultado inicial grátis. Crie sua conta para continuar explorando, salvar viagens e gerar roteiros completos.
              </div>
            ) : null}
          </BrandCard>

          <BrandCard className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Compare as opções da viagem</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Econômico, intermediário e premium organizados para comparar total, valor por pessoa e proposta da experiência.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedVariant === "economico"
                  ? "Menor custo entre as opções"
                  : selectedVariant === "premium"
                    ? "Maior conforto e investimento"
                    : "Melhor equilíbrio entre conforto e custo"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {tripVariants.map((variant) => (
                <VariantSelectorCard
                  key={variant.id}
                  variant={variant}
                  isSelected={variant.id === selectedVariant}
                  travelersCount={travelersCount}
                  onSelect={() => setSelectedVariant(variant.id)}
                  showCostDetails={!isAnonymousPreview}
                />
              ))}
            </div>
          </BrandCard>

          <Accordion type="multiple" className="space-y-4">
            <ExpandableSection value="summary-itinerary" title="Ver roteiro resumido">
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {(activeResult.itinerary.filter(Boolean).length > 0 ? activeResult.itinerary.filter(Boolean) : ["Roteiro resumido indisponível no momento."]).map(
                  (day) => (
                    <div key={day} className="rounded-2xl bg-secondary/35 px-4 py-3">
                      {day}
                    </div>
                  ),
                )}
              </div>
            </ExpandableSection>

            {!isAnonymousPreview ? (
            <ExpandableSection value="full-itinerary" title={hasFullItineraryGenerated ? "Ver roteiro completo" : "Gerar roteiro completo"}>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {hasFullItineraryGenerated ? (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        {completeTripSummary.selectedVariantLabel} • {completeTripSummary.estimatedCost} • {completeTripSummary.costPerPerson} por pessoa
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <button
                          type="button"
                          onClick={() => void handleDownload()}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
                        >
                          <Download className="size-4 text-[#004aad]" />
                          Baixar roteiro
                        </button>
                        <p className="text-xs leading-5 text-muted-foreground">Se o download não iniciar, tente abrir pelo navegador.</p>
                      </div>
                    </div>

                    {completeTripSummary.fullItinerary.map((day) => (
                      <div key={`${day.title}-${day.description}`} className="rounded-[22px] border border-border/60 bg-secondary/15 p-4">
                        <div className="font-medium text-foreground">{day.title}</div>
                        <div className="mt-3">{day.description}</div>
                        {day.tips.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {day.tips.map((tip) => (
                              <div key={tip} className="rounded-2xl bg-white/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
                                {tip}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="space-y-3 rounded-[22px] border border-border/60 bg-secondary/20 p-4">
                    <div>Gere o roteiro completo quando quiser aprofundar essa viagem. Essa ação consome 1 crédito na primeira geração.</div>
                    <button
                      type="button"
                      onClick={() => void handleGenerateFullItinerary()}
                      disabled={isGeneratingFullItinerary}
                      className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isGeneratingFullItinerary ? "Gerando roteiro completo..." : "Gerar roteiro completo"}
                    </button>
                    {actionError ? <div className="text-sm text-[#b42318]">{actionError}</div> : null}
                  </div>
                )}
              </div>
            </ExpandableSection>
            ) : null}

            {!isAnonymousPreview ? (
            <ExpandableSection value="selected-insights" title="Ver insights da opção escolhida">
              <div className="space-y-3">
                <div className="rounded-[22px] border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                  {contextText}
                </div>
                {(activeResult.tips.filter(Boolean).length > 0 ? activeResult.tips.filter(Boolean) : ["Sem observações adicionais nesta opção."]).map((tip) => (
                  <div key={tip} className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {tip}
                  </div>
                ))}
              </div>
            </ExpandableSection>
            ) : null}

            {!isAnonymousPreview && intelligence ? (
              <ExpandableSection value="why-this-trip" title="Por que essa viagem faz sentido para você">
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-border/60 bg-secondary/20 p-4">
                    <div className="text-sm font-medium text-foreground">Leitura resumida</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {intelligence.explanation?.summary?.trim() ||
                        "Analisamos custo, clima, período, lotação e perfil da viagem para montar esta recomendação."}
                    </p>
                    {intelligence.explanation?.strongestPoint ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{intelligence.explanation.strongestPoint}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <IntelligenceMetricCard
                      title="Compatibilidade"
                      score={intelligence.destinationMatchScore}
                      label={getScoreLabel("compatibility", intelligence.destinationMatchScore)}
                    />
                    <IntelligenceMetricCard
                      title="Custo"
                      score={intelligence.affordabilityScore}
                      label={getScoreLabel("cost", intelligence.affordabilityScore)}
                    />
                    <IntelligenceMetricCard
                      title="Melhor momento"
                      score={intelligence.smartTimingScore?.score}
                      label={intelligence.smartTimingScore?.label?.trim() || "Analisado"}
                    />
                    <IntelligenceMetricCard
                      title="Clima"
                      score={intelligence.climateComfortScore}
                      label={getScoreLabel("climate", intelligence.climateComfortScore)}
                    />
                    <IntelligenceMetricCard
                      title="Lotação"
                      score={intelligence.overcrowdingIndex?.score}
                      label={getScoreLabel("crowd", intelligence.overcrowdingIndex?.score ?? 0)}
                    />
                    <IntelligenceMetricCard
                      title="Rota"
                      score={intelligence.routeComfortScore}
                      label={getScoreLabel("route", intelligence.routeComfortScore)}
                    />
                  </div>

                  {intelligenceReasons.length > 0 ? (
                    <div className="space-y-3">
                      {intelligenceReasons.map((reason) => (
                        <div key={reason} className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
                          {reason}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {intelligence.dataConfidence ? (
                    <div className="rounded-[22px] border border-border/60 bg-white/80 p-4 text-sm leading-6 text-muted-foreground">
                      {getConfidenceText(intelligence.dataConfidence)}
                    </div>
                  ) : null}
                </div>
              </ExpandableSection>
            ) : null}

            {!isAnonymousPreview ? (
            <ExpandableSection value="attention-points" title="Pontos de atenção">
              <div className="space-y-3">
                {intelligence?.explanation?.attentionPoint ? (
                  <div className="rounded-[22px] border border-border/60 bg-[linear-gradient(135deg,#fff7ed,#f8fafc)] p-4 text-sm leading-6 text-muted-foreground">
                    {intelligence.explanation.attentionPoint}
                  </div>
                ) : null}

                {(intelligenceWarnings.length > 0
                  ? intelligenceWarnings
                  : ["Não há pontos críticos adicionais para esta sugestão no momento."]).map((warning) => (
                  <div
                    key={warning}
                    className="rounded-[22px] border border-border/60 bg-[linear-gradient(135deg,#fff7ed,#f8fafc)] px-4 py-3 text-sm leading-6 text-muted-foreground"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </ExpandableSection>
            ) : null}
          </Accordion>
        </div>

        <div className="space-y-5">
          <BrandCard className="p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground">Ações de exploração</h3>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => void (hasFullItineraryGenerated ? handleDownload() : handleGenerateFullItinerary())}
                disabled={isGeneratingFullItinerary}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                {isAnonymousPreview
                  ? "Entre para continuar essa viagem"
                  : !hasFullItineraryGenerated
                    ? isGeneratingFullItinerary
                      ? "Gerando roteiro completo..."
                      : "Roteiro completo sob demanda"
                  : "Baixar roteiro"}
                <Download className="size-4 text-[#004aad]" />
              </button>
              {hasFullItineraryGenerated ? (
                <p className="text-xs leading-5 text-muted-foreground">Se o download não iniciar, tente abrir pelo navegador.</p>
              ) : null}

              <button
                type="button"
                onClick={() => (isAnonymousPreview ? redirectToAuthForAction() : setIsCheaperOpen(true))}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Ver opção mais barata
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => (isAnonymousPreview ? redirectToAuthForAction() : setIsAlternativesOpen(true))}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Tentar outro destino
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => (isAnonymousPreview ? redirectToAuthForAction() : setIsAdjustOpen(true))}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Ajustar viagem
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>
            </div>
          </BrandCard>

          <BrandCard className="p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-foreground">
              <Sparkles className="size-5 text-[#004aad]" />
              <h3 className="text-lg font-semibold">Resumo comercial</h3>
            </div>
            <div className="space-y-3">
              <SummaryStat label="Destino" value={activeResult.destination || "Destino sugerido"} />
              <SummaryStat label="Período" value={tripPeriodText} />
              <SummaryStat label="Ideal para" value={bestForText} />
            </div>
            {actionError ? <div className="mt-3 text-sm text-[#b42318]">{actionError}</div> : null}
          </BrandCard>

          {loggedIn ? (
            <BrandCard glow className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-foreground">Resultado com continuidade</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Como usuário logado, você pode salvar esta busca, voltar ao dashboard e continuar ajustando destinos com o seu histórico.
              </p>

              <div className="mt-5 grid gap-3">
                <GradientButton href="/dashboard" size="lg" className="w-full">
                  Voltar ao dashboard
                </GradientButton>
                <Link
                  href={`/dashboard?prefill=${encodeURIComponent(input)}`}
                  className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
                >
                  Fazer um novo ajuste
                </Link>
              </div>
            </BrandCard>
          ) : (
            <BrandCard glow className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="size-5 text-[#004aad]" />
                <h3 className="text-lg font-semibold text-foreground">Continue depois da busca grátis</h3>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Crie sua conta para continuar explorando, salvar viagens e gerar roteiros completos. Você ainda recebe 1 crédito bônus para seguir usando o VUEI depois do resultado inicial grátis.
              </p>

              <div className="mt-5 grid gap-3">
                <GradientButton
                  href={`/login?next=${encodeURIComponent(currentResultPath)}`}
                  size="lg"
                  className="w-full"
                  onClick={() => savePostAuthRedirect(currentResultPath)}
                >
                  Entrar para continuar
                </GradientButton>
                <Link
                  href={`/cadastro?next=${encodeURIComponent(currentResultPath)}`}
                  onClick={() => savePostAuthRedirect(currentResultPath)}
                  className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
                >
                  Criar conta
                </Link>
              </div>
            </BrandCard>
          )}
        </div>
      </div>

      <Dialog open={isCheaperOpen} onOpenChange={setIsCheaperOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Opção mais barata</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Uma alternativa mais econômica para manter a viagem dentro de um custo menor.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/35 px-4 py-4">
              <div className="text-sm uppercase tracking-[0.16em] text-[#004aad]/65">Destino</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{cheaperOption.destination}</div>
              <div className="mt-3 text-sm text-muted-foreground">Custo estimado</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{cheaperOption.estimatedCost}</div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{cheaperOption.reason}</p>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setCurrentResult({
                    ...activeResult,
                    destination: cheaperOption.destination,
                    estimatedCost: cheaperOption.estimatedCost,
                    summary: "Uma alternativa mais econômica para manter a viagem viável, com menos atrito e gasto menor.",
                    context: cheaperOption.reason,
                    itinerary: [
                      "Dia 1: chegada e instalação em área prática",
                      "Dia 2: passeio principal com roteiro enxuto",
                      "Dia 3: experiência local com melhor custo-benefício",
                      "Dia 4: retorno com agenda leve",
                    ],
                    fullItinerary: [
                      `Dia 1. Manhã: chegada em ${cheaperOption.destination} e check-in. Tarde: deslocamentos curtos e organização prática. Noite: jantar simples em área bem localizada.`,
                      "Dia 2. Manhã: passeio principal com início cedo. Tarde: continuidade do roteiro central com pausa leve. Noite: descanso e jantar acessível.",
                      "Dia 3. Manhã: experiência local complementar. Tarde: agenda com melhor custo-benefício. Noite: retorno tranquilo e planejamento final.",
                      "Dia 4. Manhã: últimas visitas rápidas. Tarde: check-out e retorno. Noite: deslocamento final com menos etapas.",
                    ],
                    tips: [
                      "Hospedagens menores ajudam a controlar o orçamento.",
                      "Deslocamentos curtos reduzem o custo total.",
                      "Reservas com antecedência melhoram o preço final.",
                    ],
                    cheapestAlternative: activeResult.destination,
                    bestFor: `economia, ${activeResult.bestFor}`,
                  })
                  setSelectedVariant("economico")
                  setIsCheaperOpen(false)
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Aplicar esta opção
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAlternativesOpen} onOpenChange={setIsAlternativesOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Tentar outro destino</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Escolha uma alternativa simulada sem sair da tela de resultado.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              {alternatives.map((alternative) => (
                <button
                  key={alternative.destination}
                  type="button"
                  onClick={() => {
                    setCurrentResult({
                      ...activeResult,
                      destination: alternative.destination,
                      estimatedCost: alternative.estimatedCost,
                      summary: "Uma nova sugestão para variar a rota sem se afastar muito da ideia inicial da busca.",
                      context: alternative.reason,
                      itinerary: [
                        `Dia 1: chegada em ${alternative.destination} e reconhecimento da area`,
                        "Dia 2: passeio principal com ritmo leve",
                        "Dia 3: atividade complementar ou bate-volta",
                        "Dia 4: gastronomia local e retorno",
                      ],
                      fullItinerary: [
                        `Dia 1. Manhã: chegada em ${alternative.destination} e check-in. Tarde: reconhecimento dos pontos principais. Noite: jantar leve e descanso.`,
                        "Dia 2. Manhã: passeio principal da viagem. Tarde: continuidade da experiência com pausas confortáveis. Noite: tempo livre para gastronomia.",
                        "Dia 3. Manhã: atividade complementar. Tarde: bate-volta ou experiência local. Noite: encerramento leve do dia.",
                        "Dia 4. Manhã: últimas visitas. Tarde: check-out e retorno. Noite: deslocamento final.",
                      ],
                      tips: [
                        "Cheque datas fora do pico para reduzir custos.",
                        "Monte a agenda por proximidade entre os pontos.",
                        "Hospedagens centrais economizam tempo e deslocamento.",
                      ],
                    })
                    setIsAlternativesOpen(false)
                  }}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl border border-border/60 px-4 py-4 text-left transition hover:border-[#5de0e6]/60"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{alternative.destination}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">{alternative.reason}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{alternative.estimatedCost}</div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Ajustar viagem</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Faça um ajuste rápido e veja a sugestão ser atualizada localmente.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Orçamento</span>
                <input
                  value={adjustForm.budget}
                  onChange={(event) => setAdjustForm((value) => ({ ...value, budget: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Quantidade de dias</span>
                <input
                  value={adjustForm.duration}
                  onChange={(event) => setAdjustForm((value) => ({ ...value, duration: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Estilo da viagem</span>
                <input
                  value={adjustForm.style}
                  onChange={(event) => setAdjustForm((value) => ({ ...value, style: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Período/mês</span>
                <input
                  value={adjustForm.period}
                  onChange={(event) => setAdjustForm((value) => ({ ...value, period: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => {
                  const adjustedCost = Math.max(parsePrice(adjustForm.budget) || activeCost, 1800)

                  setCurrentResult({
                    ...activeResult,
                    estimatedCost: formatPrice(adjustedCost),
                    summary: `Viagem ajustada para ${adjustForm.duration.toLowerCase()}, com estilo ${adjustForm.style.toLowerCase()} e foco em ${adjustForm.period.toLowerCase()}.`,
                    context: `A sugestão foi recalibrada com orçamento de ${adjustForm.budget}, duração de ${adjustForm.duration}, estilo ${adjustForm.style} e período ${adjustForm.period}.`,
                    itinerary: [
                      `Dia 1: chegada e início da viagem com foco ${adjustForm.style.toLowerCase()}`,
                      `Dia 2: roteiro principal ajustado para ${adjustForm.duration.toLowerCase()}`,
                      `Dia 3: experiência complementar pensada para ${adjustForm.period.toLowerCase()}`,
                      "Dia 4: fechamento da viagem com retorno otimizado",
                    ],
                    fullItinerary: [
                      `Dia 1. Manhã: chegada e check-in dentro do orçamento de ${adjustForm.budget}. Tarde: organização da agenda principal. Noite: jantar leve e descanso.`,
                      `Dia 2. Manhã: início do roteiro principal. Tarde: experiências alinhadas à duração de ${adjustForm.duration.toLowerCase()}. Noite: pausa confortável e gastronomia.`,
                      `Dia 3. Manhã: atividades alinhadas ao estilo ${adjustForm.style.toLowerCase()}. Tarde: experiência complementar no período de ${adjustForm.period.toLowerCase()}. Noite: fechamento leve do dia.`,
                      "Dia 4. Manhã: últimos passeios. Tarde: check-out e retorno. Noite: encerramento da viagem.",
                    ],
                    tips: [
                      `Viajar em ${adjustForm.period.toLowerCase()} pode mudar disponibilidade e preço.`,
                      `O estilo ${adjustForm.style.toLowerCase()} pede uma agenda coerente com o ritmo desejado.`,
                      "Vale revisar hospedagem e deslocamento para manter o custo sob controle.",
                    ],
                    bestFor: `${adjustForm.style.toLowerCase()}, ${activeResult.bestFor}`,
                  })
                  setIsAdjustOpen(false)
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Atualizar viagem
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div ref={pdfTemplateRef}>
          <ItineraryPdfTemplate
            destination={completeTripSummary.destination}
            estimatedCost={completeTripSummary.estimatedCost}
            originSubtitle={originSubtitle}
            periodLabel={completeTripSummary.periodLabel}
            isSuggestedPeriod={completeTripSummary.isSuggestedPeriod}
            periodReason={completeTripSummary.periodReason}
            startDate={completeTripSummary.startDate}
            endDate={completeTripSummary.endDate}
            durationLabel={completeTripSummary.durationLabel}
            durationDays={completeTripSummary.durationDays}
            travelersLabel={completeTripSummary.travelersLabel}
            selectedVariantLabel={completeTripSummary.selectedVariantLabel}
            costPerPerson={completeTripSummary.costPerPerson}
            currency={completeTripSummary.currency}
            breakdown={completeTripSummary.breakdown}
            assumptions={completeTripSummary.assumptions}
            summary={completeTripSummary.summary}
            itinerary={completeTripSummary.shortItinerary}
            detailedItinerary={completeTripSummary.fullItinerary}
            insights={completeTripSummary.insights}
            whyThisTrip={completeTripSummary.whyThisTrip}
            attentionPoints={completeTripSummary.attentionPoints}
          />
        </div>
      </div>
    </>
  )
}



