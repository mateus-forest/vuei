import { Map, MessageSquare, Sparkles } from "lucide-react"
import { SectionShell } from "@/components/ui/section-shell"

const steps = [
  {
    icon: MessageSquare,
    number: "01",
    title: "Descreva a viagem",
    description: "Conte o que você quer viver, quanto pretende gastar e qual momento da viagem importa mais.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Receba a simulação",
    description: "O VUEI cruza contexto, perfil e praticidade para sugerir um destino com clareza imediata.",
  },
  {
    icon: Map,
    number: "03",
    title: "Decida e continue",
    description: "Veja custos, o melhor uso da viagem, um roteiro resumido e siga com ajustes, login ou uma nova busca.",
  },
]

export function HowItWorksSection() {
  return (
    <SectionShell id="como-funciona" className="bg-secondary/35">
      <div className="mb-14 text-center">
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Como funciona</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Planejamento simples, rápido e com menos fricção para decidir.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="relative">
            {index < steps.length - 1 ? (
              <div className="absolute left-full top-14 hidden h-px w-full bg-[linear-gradient(90deg,#5de0e6,#004aad)] opacity-30 md:block" />
            ) : null}
            <div className="h-full rounded-[28px] border border-border/60 bg-white/90 p-8 shadow-[0_20px_60px_rgba(0,74,173,0.08)]">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#5de0e6,#004aad)]">
                  <step.icon className="size-7 text-white" />
                </div>
                <span className="text-5xl font-semibold text-[#004aad]/20">{step.number}</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
