import Link from "next/link"
import { Briefcase, Compass, Heart, Mountain, Sparkles, Users } from "lucide-react"
import { BrandBadge } from "@/components/ui/brand-badge"
import { BrandCard } from "@/components/ui/brand-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { SectionShell } from "@/components/ui/section-shell"

const tripTypes = [
  { icon: Heart, label: "Romântica" },
  { icon: Users, label: "Família" },
  { icon: Mountain, label: "Aventura" },
  { icon: Briefcase, label: "Prática" },
]

export function QuizTeaserSection() {
  return (
    <SectionShell className="overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/40 to-transparent" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <BrandBadge className="mb-5">
            <Compass className="size-4 text-[#5de0e6]" />
            Descoberta rápida
          </BrandBadge>
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">Não sabe por onde começar?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Responda rápido e deixe o quiz encaixar estilo, orçamento e clima em uma sugestão clara.
          </p>
        </div>

        <BrandCard glow className="p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-[#004aad]/70">Fluxo guiado</p>
              <div className="grid grid-cols-2 gap-3">
                {tripTypes.map((type) => (
                  <div
                    key={type.label}
                    className="rounded-[20px] border border-border/60 bg-secondary/40 p-4 transition hover:border-[#5de0e6]/50"
                  >
                    <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5de0e6,#004aad)]">
                      <type.icon className="size-5 text-white" />
                    </div>
                    <div className="text-sm font-medium text-foreground">{type.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-border/60 bg-white/70 p-5 sm:p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Em menos de 1 minuto</div>
                  <div className="mt-2 font-heading text-2xl font-semibold text-foreground">Encontre um destino com mais contexto</div>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Estilo de viagem, orçamento, duração e vibe</li>
                  <li>Sugestão imediata com custo estimado</li>
                  <li>Redirecionamento direto para o resultado</li>
                </ul>
                <GradientButton asChild size="lg" className="mt-2 w-full">
                  <Link href="/quiz">
                    <Sparkles className="size-5" />
                    Fazer quiz agora
                  </Link>
                </GradientButton>
              </div>
            </div>
          </div>
        </BrandCard>
      </div>
    </SectionShell>
  )
}
