"use client"

import Link from "next/link"
import { type ReactNode, useMemo, useRef, useState } from "react"
import { ArrowLeftRight, Compass, CreditCard, Download, Map, Wallet } from "lucide-react"
import { ItineraryPdfTemplate } from "@/components/trip/itinerary-pdf-template"
import { BrandCard } from "@/components/ui/brand-card"
import { GradientButton } from "@/components/ui/gradient-button"
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

  if (normalized.includes("solo")) {
    return 1
  }

  if (normalized.includes("fam")) {
    return 3
  }

  if (normalized.includes("casal") || normalized.includes("dupla")) {
    return 2
  }

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
      title: "Econômico",
      total: roundCurrency(Math.max(safeBaseCost - 1200, 1200)),
      insight:
        "Essa opção reduz custos priorizando hospedagens mais econômicas e transporte simplificado, mantendo as principais experiências do destino.",
    },
    {
      id: "intermediario",
      title: "Intermediário",
      total: roundCurrency(safeBaseCost),
      insight:
        "Essa opção equilibra conforto, localização e experiências principais, sem elevar demais o investimento total da viagem.",
    },
    {
      id: "premium",
      title: "Premium",
      total: roundCurrency(Math.min(safeBaseCost + 2200, 18000)),
      insight:
        "Essa opção aumenta conforto e conveniência com hospedagem melhor localizada, deslocamentos mais fluidos e experiências mais completas.",
    },
  ]

  return variants.map((variant): TripVariant => {
    const periodItinerary = buildPeriodItinerary(result, baseDetailedItinerary, variant.id)
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
        "Reservar experiências concorridas antes da viagem melhora disponibilidade.",
        "Um roteiro com pausas maiores deixa a experiência mais agradável e sofisticada.",
      ],
    }

    const summaryByVariant: Record<VariantId, string> = {
      economico: "Versão mais enxuta da viagem, priorizando boa experiência com orçamento controlado.",
      intermediario: "Versão equilibrada da viagem, combinando conforto, praticidade e experiências centrais.",
      premium: "Versão mais completa da viagem, com mais conforto, ritmo fluido e melhor conveniência.",
    }

    const resultForVariant: TripResult = {
      ...result,
      estimatedCost: formatPrice(variant.total),
      summary: summaryByVariant[variant.id],
      context: variant.insight,
      tips: tipsByVariant[variant.id],
      fullItinerary: periodItinerary.map(
        (day) => `${day.title}. Manhã: ${day.morning} Tarde: ${day.afternoon} Noite: ${day.night}`,
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
  const [isFullItineraryOpen, setIsFullItineraryOpen] = useState(false)
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
  const activeVariant = tripVariants.find((variant) => variant.id === selectedVariant) ?? tripVariants[1]
  const activeResult = activeVariant.result
  const activePeriodItinerary = activeVariant.periodItinerary
  const activeDetailedItinerary = activeResult.fullItinerary ?? buildDetailedItinerary(activeResult)
  const activeCost = parsePrice(activeResult.estimatedCost)
  const travelersCount = inferTravelers(activeResult.bestFor)
  const daysCount = Math.max(activePeriodItinerary.length, activeResult.itinerary.length, 1)
  const costPerTraveler = Math.max(300, Math.round(activeCost / travelersCount))
  const tripPeriodText = activeResult.periodLabel ?? activeResult.durationLabel ?? "Período não informado"

  const originSubtitle =
    source === "quiz"
      ? "Baseado nas suas respostas do quiz"
      : source === "suggestion" && suggestion
        ? `Baseado na sugestão escolhida: ${suggestion}`
        : `Baseado na sua busca: ${input}`

  const cheaperOption = {
    destination: activeResult.cheapestAlternative ?? `${activeResult.destination} Essencial`,
    estimatedCost: formatPrice(Math.max(activeCost - 900, 1800)),
    reason:
      "Mantém a proposta principal da viagem, com custo menor, hospedagem mais enxuta e deslocamentos simplificados.",
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
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <BrandCard glow className="p-7 sm:p-8">
            <InlineBadge className="mb-4">
              <Compass className="size-4 text-[#5de0e6]" />
              Sugestão principal
            </InlineBadge>

            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-[#004aad]/65">Destino sugerido</p>
                <h2 className="mt-2 font-heading text-4xl font-bold text-foreground">{activeResult.destination}</h2>
                <p className="mt-4 max-w-2xl text-muted-foreground">{activeResult.summary}</p>
              </div>

              <div className="min-w-[220px] rounded-[24px] border border-border/60 bg-secondary/40 p-5">
                <div className="text-sm text-muted-foreground">Custo total estimado</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{activeResult.estimatedCost}</div>
                <div className="mt-3 text-sm text-muted-foreground">Custo estimado por pessoa: {formatPrice(costPerTraveler)}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Baseado em {formatTravelerLabel(travelersCount)} por {daysCount} {daysCount === 1 ? "dia" : "dias"}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Período: {tripPeriodText}</div>
                <div className="mt-2 text-sm text-muted-foreground">Ideal para {activeResult.bestFor}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {tripVariants.map((variant) => {
                const isSelected = variant.id === activeVariant.id

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant.id)}
                    className={cn(
                      "rounded-[24px] border p-4 text-left transition",
                      isSelected
                        ? "border-[#5de0e6] bg-[linear-gradient(135deg,#5de0e614,#004aad14)] shadow-sm"
                        : "border-border/60 bg-secondary/20 hover:border-[#5de0e6]/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">{variant.title}</div>
                        <div className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Custo total estimado</div>
                        <div className="mt-1 text-2xl font-semibold text-foreground">{formatPrice(variant.total)}</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Por pessoa: {formatPrice(Math.max(300, Math.round(variant.total / travelersCount)))}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Baseado em {formatTravelerLabel(travelersCount)} por {daysCount} {daysCount === 1 ? "dia" : "dias"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 rounded-2xl bg-white/70 px-4 py-3">
                      {variant.breakdown.map((item) => (
                        <div key={`${variant.id}-${item.label}`} className="flex items-center justify-between gap-3 text-sm">
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
                  </button>
                )
              })}
            </div>
          </BrandCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <BrandCard className="p-6">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <Map className="size-5 text-[#004aad]" />
                <h3 className="text-lg font-semibold">Roteiro resumido</h3>
              </div>

              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                {activeResult.itinerary.map((day) => (
                  <li key={day} className="rounded-2xl bg-secondary/35 px-4 py-3">
                    {day}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setIsFullItineraryOpen(true)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                <Map className="size-4 text-[#004aad]" />
                Ver roteiro completo
              </button>

              <button
                type="button"
                onClick={() => void handleDownload()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                <Download className="size-4 text-[#004aad]" />
                Baixar roteiro
              </button>
            </BrandCard>

            <BrandCard className="p-6">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <Wallet className="size-5 text-[#004aad]" />
                <h3 className="text-lg font-semibold">Insight da opção escolhida</h3>
              </div>

              <p className="rounded-2xl bg-secondary/35 px-4 py-4 text-sm leading-6 text-muted-foreground">
                {activeResult.context}
              </p>

              <div className="mt-5 space-y-3">
                {activeResult.tips.map((tip) => (
                  <div key={tip} className="rounded-2xl border border-border/50 px-4 py-3 text-sm text-muted-foreground">
                    {tip}
                  </div>
                ))}
              </div>
            </BrandCard>
          </div>
        </div>

        <div className="space-y-6">
          <BrandCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground">Ações de exploração</h3>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setIsCheaperOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-border/60 px-4 py-4 text-sm transition hover:border-[#5de0e6]/60"
              >
                Ver opção mais barata
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => setIsAlternativesOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-border/60 px-4 py-4 text-sm transition hover:border-[#5de0e6]/60"
              >
                Tentar outro destino
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>

              <button
                type="button"
                onClick={() => setIsAdjustOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-border/60 px-4 py-4 text-sm transition hover:border-[#5de0e6]/60"
              >
                Ajustar viagem
                <ArrowLeftRight className="size-4 text-[#004aad]" />
              </button>
            </div>
          </BrandCard>

          {loggedIn ? (
            <BrandCard glow className="p-6">
              <h3 className="text-lg font-semibold text-foreground">Resultado com continuidade</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Como usuário logado, você pode salvar esta busca, voltar ao dashboard e continuar ajustando destinos com
                o seu histórico.
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
            <BrandCard glow className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="size-5 text-[#004aad]" />
                <h3 className="text-lg font-semibold text-foreground">Continue depois da busca grátis</h3>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Você já viu o valor e a direção da viagem. Faça login para salvar histórico, continuar ajustes e encontrar
                sua viagem ideal de forma rápida com VUEI.
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

      <Dialog open={isFullItineraryOpen} onOpenChange={setIsFullItineraryOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="flex min-h-0 flex-1 flex-col p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Roteiro completo</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Veja o detalhamento da sugestão montada pelo VUEI para {activeResult.destination}.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex-1 overflow-y-auto pr-1">
              <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                {activePeriodItinerary.map((day) => (
                  <div key={`${day.title}-modal`} className="rounded-[24px] border border-border/60 bg-white/80 p-4">
                    <div className="font-medium text-foreground">{day.title}</div>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <span className="font-medium text-foreground">Manhã:</span> {day.morning}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Tarde:</span> {day.afternoon}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Noite:</span> {day.night}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-6 shrink-0 gap-3 sm:justify-between">
              <button
                type="button"
                onClick={() => setIsFullItineraryOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                <Download className="size-4 text-[#004aad]" />
                Baixar roteiro
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
                      summary: "Uma nova sugestão para variar a rota sem se afastar muito da ideia inicial da busca.",
                      context: alternative.reason,
                      itinerary: [
                        `Dia 1: chegada em ${alternative.destination} e reconhecimento da área`,
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
            destination={activeResult.destination}
            estimatedCost={activeResult.estimatedCost}
            originSubtitle={originSubtitle}
            periodLabel={activeResult.periodLabel}
            durationLabel={activeResult.durationLabel}
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
