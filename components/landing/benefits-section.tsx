import { Calculator, Globe, Sparkles, Zap } from "lucide-react"
import { SectionShell } from "@/components/ui/section-shell"

const benefits = [
  { icon: Globe, title: "Descubra destinos", description: "Sugestoes alinhadas ao perfil e ao momento da viagem." },
  { icon: Calculator, title: "Simule custos", description: "Veja o valor estimado cedo para tomar decisao com clareza." },
  { icon: Sparkles, title: "Receba um roteiro", description: "Um resumo dia a dia para enxergar a viagem acontecendo." },
  { icon: Zap, title: "Decida em segundos", description: "Menos pesquisa manual e mais decisao imediata." },
]

export function BenefitsSection() {
  return (
    <SectionShell id="beneficios">
      <div className="mb-14 text-center">
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Tudo que voce precisa para{" "}
          <span className="bg-[linear-gradient(90deg,#5de0e6,#004aad)] bg-clip-text text-transparent">planejar melhor</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A home continua simples, mas agora vira base real de produto completo.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {benefits.map((item) => (
          <div
            key={item.title}
            className="group rounded-[28px] border border-border/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(0,74,173,0.06)] transition hover:-translate-y-1 hover:border-[#5de0e6]/50"
          >
            <div className="mb-5 flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#5de0e620,#004aad20)] transition group-hover:bg-[linear-gradient(135deg,#5de0e6,#004aad)]">
              <item.icon className="size-6 text-[#004aad] transition group-hover:text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
