"use client"

import { MessageSquare, Sparkles, Map } from "lucide-react"

const steps = [
  {
    icon: MessageSquare,
    number: "01",
    title: "Descreva sua viagem",
    description: "Conte para a IA o que você procura: destino, orçamento, duração ou simplesmente deixe ela surpreender você."
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Receba sugestões instantâneas",
    description: "Em segundos, receba destinos personalizados baseados nas suas preferências e momento ideal para viajar."
  },
  {
    icon: Map,
    number: "03",
    title: "Explore custos e roteiro",
    description: "Visualize custos detalhados, hospedagem, transporte e um roteiro completo dia a dia."
  }
]

export function HowItWorks() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Planeje sua viagem em 3 passos simples
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative group"
            >
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#5de0e6] to-[#004aad] opacity-30" />
              )}

              <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#5de0e6] to-[#004aad] flex items-center justify-center shadow-lg shadow-[#004aad]/20 group-hover:scale-110 transition-transform">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-5xl font-bold bg-gradient-to-r from-[#5de0e6] to-[#004aad] bg-clip-text text-transparent opacity-30">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
