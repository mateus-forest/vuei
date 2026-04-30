"use client"

import Link from "next/link"
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
import type { TripResult } from "@/types/trip"
import { cn } from "@/lib/utils"

type VariantId = "economico" | "intermediario" | "premium"
type ScoreLabelType = "compatibility" | "cost" | "climate" | "crowd" | "route"

type DayPeriodPlan = {
  title: string
  morning: string
  afternoon: string
  night: string
}

type TripVariant = {
  id: VariantId
  title: string
  total: number
  insight: string
  breakdown: Array<{ label: string; value: number }>
  result: TripResult
  periodItinerary: DayPeriodPlan[]
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
  return (
    result.fullItinerary ??
    result.itinerary.map((day, index) => {
      const complements = [
        `Organize a chegada, os deslocamentos principais e um primeiro contato com ${result.destination}.`,
        "Reserve este periodo para aproveitar a experiencia central da viagem com mais calma e menos correria.",
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

  const labels = ["Passagens", "Hospedagem", "Alimentacao", "Transporte", "Passeios"]
  const values = ratios.map((ratio) => roundCurrency(total * ratio))
  const adjustment = total - values.reduce((sum, value) => sum + value, 0)
  values[1] += adjustment

  return labels.map((label, index) => ({
    label,
    value: values[index],
  }))
}

function buildPeriodItinerary(result: TripResult, detailedItinerary: string[], variantId: VariantId): DayPeriodPlan[] {
  const momentsByVariant: Record<VariantId, { morning: string; afternoon: string; night: string }> = {
    economico: {
      morning: `Comece o dia em ${result.destination} com deslocamentos praticos e agenda objetiva.`,
      afternoon: "Priorize o passeio central do destino com logistica simplificada e boas paradas.",
      night: "Finalize com jantar em area acessivel e ritmo mais enxuto para controlar custos.",
    },
    intermediario: {
      morning: `Inicie o dia em ${result.destination} com agenda equilibrada e tempo para explorar com calma.`,
      afternoon: "Aproveite a experiencia principal do destino com deslocamentos confortaveis e pausas bem distribuidas.",
      night: "Feche o dia com boa gastronomia local e uma noite leve para manter o ritmo da viagem.",
    },
    premium: {
      morning: `Comece o dia em ${result.destination} com mais conforto, deslocamentos suaves e experiencia bem organizada.`,
      afternoon: "Aprofunde os passeios principais com mais conveniencia, tempo de pausa e agenda fluida.",
      night: "Encerramento com jantar especial, caminhada agradavel ou experiencia noturna mais refinada.",
    },
  }

  return detailedItinerary.map((description, index) => {
    const title = result.itinerary[index] ?? `Dia ${index + 1}`
    const moments = momentsByVariant[variantId]

    return {
      title,
      morning: moments.morning,
      afternoon: `${moments.afternoon} ${description}`.trim(),
      night: moments.night,
    }
  })
}

function buildTripVariants(result: TripResult, currentCost: number) {
  const safeBaseCost = Math.max(currentCost, 1800)
  const baseDetailedItinerary = buildDetailedItinerary(result)

  const variants: Array<{ id: VariantId; title: string; total: number; insight: string }> = [
    {
      id: "economico",
      title: "Economico",
      total: roundCurrency(Math.max(safeBaseCost - 1200, 1200)),
      insight:
        "Prioriza o essencial da viagem com hospedagem mais enxuta, logistica simples e custo menor para comparar com clareza.",
    },
    {
      id: "intermediario",
      title: "Intermediario",
      total: roundCurrency(safeBaseCost),
      insight:
        "Equilibra conforto, localizacao e experiencias centrais sem elevar demais o investimento total da viagem.",
    },
    {
      id: "premium",
      title: "Premium",
      total: roundCurrency(Math.min(safeBaseCost + 2200, 18000)),
      insight:
        "Aumenta conforto e conveniencia com hospedagem melhor localizada, deslocamentos mais fluidos e agenda mais completa.",
    },
  ]

  return variants.map((variant): TripVariant => {
    const periodItinerary = buildPeriodItinerary(result, baseDetailedItinerary, variant.id)
    const tipsByVariant: Record<VariantId, string[]> = {
      economico: [
        "Hospedagens economicas em areas bem conectadas ajudam a controlar o orcamento.",
        "Concentrar passeios principais reduz deslocamentos e gastos extras.",
        "Viajar fora da alta temporada costuma melhorar bastante o custo-beneficio.",
      ],
      intermediario: [
        "Um roteiro equilibrado combina boa localizacao, conforto e agenda sem correria.",
        "Reservar com antecedencia ajuda a manter o custo previsivel.",
        "Vale ajustar os dias centrais para encaixar experiencias mais completas.",
      ],
      premium: [
        "Hospedagens centrais e deslocamentos mais confortaveis aumentam a fluidez da viagem.",
        "Reservar experiencias concorridas antes da viagem melhora disponibilidade.",
        "Um roteiro com pausas maiores deixa a experiencia mais agradavel e sofisticada.",
      ],
    }

    const summaryByVariant: Record<VariantId, string> = {
      economico: "Versao mais enxuta da viagem, priorizando boa experiencia com orcamento controlado.",
      intermediario: "Versao equilibrada da viagem, combinando conforto, praticidade e experiencias centrais.",
      premium: "Versao mais completa da viagem, com mais conforto, ritmo fluido e melhor conveniencia.",
    }

    const resultForVariant: TripResult = {
      ...result,
      estimatedCost: formatPrice(variant.total),
      summary: summaryByVariant[variant.id],
      context: variant.insight,
      tips: tipsByVariant[variant.id],
      fullItinerary: periodItinerary.map(
        (day) => `${day.title}. Manha: ${day.morning} Tarde: ${day.afternoon} Noite: ${day.night}`,
      ),
    }

    return {
      ...variant,
      breakdown: buildBreakdown(variant.total, variant.id),
      result: resultForVariant,
      periodItinerary,
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
    if (score <= 60) return "Razoavel"
    return "Economico"
  }

  if (type === "climate") {
    if (score <= 39) return "Desfavoravel"
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
  return "Confortavel"
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

  return "Periodo nao informado"
}

function formatDurationDisplay(result: TripResult, fallbackDays: number) {
  if (result.durationLabel?.trim()) return result.durationLabel.trim()
  if (result.durationDays && result.durationDays > 0) return `${result.durationDays} ${result.durationDays === 1 ? "dia" : "dias"}`
  return `${fallbackDays} ${fallbackDays === 1 ? "dia" : "dias"}`
}

function getSelectedVariantLabel(variantId: VariantId) {
  if (variantId === "economico") return "Economico"
  if (variantId === "premium") return "Premium"
  return "Intermediario"
}

function buildOriginSubtitle(source: string, suggestion: string, input: string) {
  if (source === "quiz") {
    return "Baseado nas suas respostas do quiz"
  }

  if (source === "suggestion" && suggestion) {
    return `Baseado na sugestao escolhida: ${suggestion}`
  }

  return `Baseado na sua busca: ${input}`
}

function getConfidenceText(confidence?: "high" | "medium" | "low") {
  if (confidence === "high") {
    return "Usamos dados mais especificos para esse destino, deixando a leitura mais precisa."
  }

  if (confidence === "medium") {
    return "Combinamos dados do destino com estimativas seguras para manter a recomendacao confiavel."
  }

  if (confidence === "low") {
    return "A recomendacao foi completada com heuristicas regionais para nao travar sua experiencia."
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
}: {
  value: string
  breakdown: Array<{ label: string; value: number }>
  travelersCount: number
}) {
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
}: {
  variant: TripVariant
  isSelected: boolean
  travelersCount: number
  onSelect: () => void
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

      <CostDetails value={`cost-${variant.id}`} breakdown={variant.breakdown} travelersCount={travelersCount} />
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
  const [selectedVariant, setSelectedVariant] = useState<VariantId>("intermediario")
  const [isCheaperOpen, setIsCheaperOpen] = useState(false)
  const [isAlternativesOpen, setIsAlternativesOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustForm, setAdjustForm] = useState({
    budget: "R$ 4.500",
    duration: "5 dias",
    style: "Equilibrada",
    period: "Julho",
  })
  const pdfTemplateRef = useRef<HTMLDivElement>(null)

  const baseCost = parsePrice(currentResult.estimatedCost)
  const tripVariants = useMemo(() => buildTripVariants(currentResult, baseCost), [currentResult, baseCost])
  const activeVariant = tripVariants.find((variant) => variant.id === selectedVariant) ?? tripVariants[1] ?? tripVariants[0]
  const activeResult = activeVariant.result
  const activePeriodItinerary = activeVariant.periodItinerary.filter((item) => item.title || item.morning || item.afternoon || item.night)
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
  const summaryText = activeResult.summary?.trim() || "Encontramos uma sugestao pronta para comparar melhor custo, ritmo e conforto."
  const contextText = activeResult.context?.trim() || "A opcao escolhida equilibra custo, experiencia e praticidade para a viagem."
  const bestForText = activeResult.bestFor?.trim() || "viagem flexivel"

  const originSubtitle = buildOriginSubtitle(source, suggestion, input)

  const cheaperOption = {
    destination: activeResult.cheapestAlternative ?? `${activeResult.destination} Essencial`,
    estimatedCost: formatPrice(Math.max(activeCost - 900, 1800)),
    reason: "Mantem a proposta principal da viagem, com custo menor, hospedagem mais enxuta e deslocamentos simplificados.",
  }

  const alternatives = [
    {
      destination: activeResult.cheapestAlternative ?? "Porto",
      estimatedCost: formatPrice(Math.max(activeCost - 700, 1900)),
      reason: "Alternativa com melhor custo-beneficio e logistica simples.",
    },
    {
      destination: `${activeResult.destination} Panorama`,
      estimatedCost: formatPrice(Math.max(activeCost + 200, 2200)),
      reason: "Variacao proxima da ideia original, com experiencia parecida e ajuste leve de custo.",
    },
    {
      destination: `${activeResult.destination} Compacto`,
      estimatedCost: formatPrice(Math.max(activeCost - 400, 2000)),
      reason: "Opcao enxuta para manter a viagem viavel sem se distanciar da proposta inicial.",
    },
  ]

  async function handleDownload() {
    if (!pdfTemplateRef.current) return

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
            '[data-pdf-section="summary"]',
            '[data-pdf-section="short-itinerary"]',
            '[data-pdf-section="full-itinerary"]',
            '[data-pdf-section="tips"]',
            '[data-pdf-section="final-notes"]',
          ],
        },
      })
      .from(pdfTemplateRef.current)
      .save()
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-5">
          <BrandCard glow className="p-5 sm:p-6">
            <InlineBadge>
              <Compass className="size-4 text-[#5de0e6]" />
              Sugestao principal
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
                <SummaryStat label="Versao selecionada" value={getSelectedVariantLabel(selectedVariant)} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStat label="Periodo" value={tripPeriodText} />
              <SummaryStat label="Duracao" value={durationText} />
              <SummaryStat label="Pessoas" value={formatTravelerLabel(travelersCount)} />
              <SummaryStat label="Por pessoa" value={formatPrice(costPerTraveler)} />
            </div>
          </BrandCard>

          <BrandCard className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Compare as opcoes da viagem</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Economico, intermediario e premium organizados para comparar total, valor por pessoa e proposta da experiencia.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedVariant === "economico"
                  ? "Menor custo entre as opcoes"
                  : selectedVariant === "premium"
                    ? "Maior conforto e investimento"
                    : "Melhor equilibrio entre conforto e custo"}
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
                />
              ))}
            </div>
          </BrandCard>

          <Accordion type="multiple" className="space-y-4">
            <ExpandableSection value="summary-itinerary" title="Ver roteiro resumido">
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {(activeResult.itinerary.filter(Boolean).length > 0 ? activeResult.itinerary.filter(Boolean) : ["Roteiro resumido indisponivel no momento."]).map(
                  (day) => (
                    <div key={day} className="rounded-2xl bg-secondary/35 px-4 py-3">
                      {day}
                    </div>
                  ),
                )}
              </div>
            </ExpandableSection>

            <ExpandableSection value="full-itinerary" title="Ver roteiro completo">
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {activePeriodItinerary.length > 0
                  ? activePeriodItinerary.map((day) => (
                      <div key={`${day.title}-expanded`} className="rounded-[22px] border border-border/60 bg-secondary/15 p-4">
                        <div className="font-medium text-foreground">{day.title}</div>
                        <div className="mt-3 grid gap-2">
                          <div>
                            <span className="font-medium text-foreground">Manha:</span> {day.morning}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Tarde:</span> {day.afternoon}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Noite:</span> {day.night}
                          </div>
                        </div>
                      </div>
                    ))
                  : activeDetailedItinerary.map((day) => (
                      <div key={day} className="rounded-2xl bg-secondary/35 px-4 py-3">
                        {day}
                      </div>
                    ))}
              </div>
            </ExpandableSection>

            <ExpandableSection value="selected-insights" title="Ver insights da opcao escolhida">
              <div className="space-y-3">
                <div className="rounded-[22px] border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                  {contextText}
                </div>
                {(activeResult.tips.filter(Boolean).length > 0 ? activeResult.tips.filter(Boolean) : ["Sem observacoes adicionais nesta opcao."]).map((tip) => (
                  <div key={tip} className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {tip}
                  </div>
                ))}
              </div>
            </ExpandableSection>

            {intelligence ? (
              <ExpandableSection value="why-this-trip" title="Por que essa viagem faz sentido para voce">
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-border/60 bg-secondary/20 p-4">
                    <div className="text-sm font-medium text-foreground">Leitura resumida</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {intelligence.explanation?.summary?.trim() ||
                        "Analisamos custo, clima, periodo, lotacao e perfil da viagem para montar esta recomendacao."}
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
                      title="Lotacao"
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

            <ExpandableSection value="attention-points" title="Pontos de atencao">
              <div className="space-y-3">
                {intelligence?.explanation?.attentionPoint ? (
                  <div className="rounded-[22px] border border-border/60 bg-[linear-gradient(135deg,#fff7ed,#f8fafc)] p-4 text-sm leading-6 text-muted-foreground">
                    {intelligence.explanation.attentionPoint}
                  </div>
                ) : null}

                {(intelligenceWarnings.length > 0
                  ? intelligenceWarnings
                  : ["Nao ha pontos criticos adicionais para esta sugestao no momento."]).map((warning) => (
                  <div
                    key={warning}
                    className="rounded-[22px] border border-border/60 bg-[linear-gradient(135deg,#fff7ed,#f8fafc)] px-4 py-3 text-sm leading-6 text-muted-foreground"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </ExpandableSection>
          </Accordion>
        </div>

        <div className="space-y-5">
          <BrandCard className="p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground">Acoes de exploracao</h3>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Baixar roteiro
                <Download className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => setIsCheaperOpen(true)}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Ver opcao mais barata
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => setIsAlternativesOpen(true)}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Tentar outro destino
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => setIsAdjustOpen(true)}
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
              <SummaryStat label="Periodo" value={tripPeriodText} />
              <SummaryStat label="Ideal para" value={bestForText} />
            </div>
          </BrandCard>

          {loggedIn ? (
            <BrandCard glow className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-foreground">Resultado com continuidade</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Como usuario logado, voce pode salvar esta busca, voltar ao dashboard e continuar ajustando destinos com o seu historico.
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
                <h3 className="text-lg font-semibold text-foreground">Continue depois da busca gratis</h3>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Voce ja viu o valor e a direcao da viagem. Faca login para salvar historico, continuar ajustes e encontrar sua viagem ideal de forma rapida com VUEI.
              </p>

              <div className="mt-5 grid gap-3">
                <GradientButton href="/login" size="lg" className="w-full">
                  Entrar para continuar
                </GradientButton>
                <Link
                  href="/cadastro"
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
              <DialogTitle className="font-heading text-2xl text-foreground">Opcao mais barata</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Uma alternativa mais economica para manter a viagem dentro de um custo menor.
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
                    summary: "Uma alternativa mais economica para manter a viagem viavel, com menos atrito e gasto menor.",
                    context: cheaperOption.reason,
                    itinerary: [
                      "Dia 1: chegada e instalacao em area pratica",
                      "Dia 2: passeio principal com roteiro enxuto",
                      "Dia 3: experiencia local com melhor custo-beneficio",
                      "Dia 4: retorno com agenda leve",
                    ],
                    fullItinerary: [
                      `Dia 1. Manha: chegada em ${cheaperOption.destination} e check-in. Tarde: deslocamentos curtos e organizacao pratica. Noite: jantar simples em area bem localizada.`,
                      "Dia 2. Manha: passeio principal com inicio cedo. Tarde: continuidade do roteiro central com pausa leve. Noite: descanso e jantar acessivel.",
                      "Dia 3. Manha: experiencia local complementar. Tarde: agenda com melhor custo-beneficio. Noite: retorno tranquilo e planejamento final.",
                      "Dia 4. Manha: ultimas visitas rapidas. Tarde: check-out e retorno. Noite: deslocamento final com menos etapas.",
                    ],
                    tips: [
                      "Hospedagens menores ajudam a controlar o orcamento.",
                      "Deslocamentos curtos reduzem o custo total.",
                      "Reservas com antecedencia melhoram o preco final.",
                    ],
                    cheapestAlternative: activeResult.destination,
                    bestFor: `economia, ${activeResult.bestFor}`,
                  })
                  setSelectedVariant("economico")
                  setIsCheaperOpen(false)
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Aplicar esta opcao
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
                Escolha uma alternativa mockada sem sair da tela de resultado.
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
                      summary: "Uma nova sugestao para variar a rota sem se afastar muito da ideia inicial da busca.",
                      context: alternative.reason,
                      itinerary: [
                        `Dia 1: chegada em ${alternative.destination} e reconhecimento da area`,
                        "Dia 2: passeio principal com ritmo leve",
                        "Dia 3: atividade complementar ou bate-volta",
                        "Dia 4: gastronomia local e retorno",
                      ],
                      fullItinerary: [
                        `Dia 1. Manha: chegada em ${alternative.destination} e check-in. Tarde: reconhecimento dos pontos principais. Noite: jantar leve e descanso.`,
                        "Dia 2. Manha: passeio principal da viagem. Tarde: continuidade da experiencia com pausas confortaveis. Noite: tempo livre para gastronomia.",
                        "Dia 3. Manha: atividade complementar. Tarde: bate-volta ou experiencia local. Noite: encerramento leve do dia.",
                        "Dia 4. Manha: ultimas visitas. Tarde: check-out e retorno. Noite: deslocamento final.",
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
                Faca um ajuste rapido e veja a sugestao ser atualizada localmente.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Orcamento</span>
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
                <span className="mb-2 block text-sm font-medium text-foreground">Periodo/mes</span>
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
                    context: `A sugestao foi recalibrada com orcamento de ${adjustForm.budget}, duracao de ${adjustForm.duration}, estilo ${adjustForm.style} e periodo ${adjustForm.period}.`,
                    itinerary: [
                      `Dia 1: chegada e inicio da viagem com foco ${adjustForm.style.toLowerCase()}`,
                      `Dia 2: roteiro principal ajustado para ${adjustForm.duration.toLowerCase()}`,
                      `Dia 3: experiencia complementar pensada para ${adjustForm.period.toLowerCase()}`,
                      "Dia 4: fechamento da viagem com retorno otimizado",
                    ],
                    fullItinerary: [
                      `Dia 1. Manha: chegada e check-in dentro do orcamento de ${adjustForm.budget}. Tarde: organizacao da agenda principal. Noite: jantar leve e descanso.`,
                      `Dia 2. Manha: inicio do roteiro principal. Tarde: experiencias alinhadas a duracao de ${adjustForm.duration.toLowerCase()}. Noite: pausa confortavel e gastronomia.`,
                      `Dia 3. Manha: atividades alinhadas ao estilo ${adjustForm.style.toLowerCase()}. Tarde: experiencia complementar no periodo de ${adjustForm.period.toLowerCase()}. Noite: fechamento leve do dia.`,
                      "Dia 4. Manha: ultimos passeios. Tarde: check-out e retorno. Noite: encerramento da viagem.",
                    ],
                    tips: [
                      `Viajar em ${adjustForm.period.toLowerCase()} pode mudar disponibilidade e preco.`,
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
            destination={activeResult.destination}
            estimatedCost={activeResult.estimatedCost}
            originSubtitle={originSubtitle}
            periodLabel={activeResult.periodLabel ?? tripPeriodText}
            durationLabel={activeResult.durationLabel ?? durationText}
            summary={activeResult.summary}
            itinerary={activeResult.itinerary}
            detailedItinerary={activeDetailedItinerary}
            tips={activeResult.tips}
          />
        </div>
      </div>
    </>
  )
}
