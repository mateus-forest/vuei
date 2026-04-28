"use client"

import { Globe, Calculator, Sparkles, Zap } from "lucide-react"

const features = [
  {
    icon: Globe,
    title: "Descubra destinos",
    description: "Encontre lugares incríveis que combinam com seu perfil e orçamento."
  },
  {
    icon: Calculator,
    title: "Simule custos",
    description: "Saiba quanto vai gastar antes de viajar com estimativas precisas."
  },
  {
    icon: Sparkles,
    title: "Gere roteiros com IA",
    description: "Roteiros personalizados criados por inteligência artificial em segundos."
  },
  {
    icon: Zap,
    title: "Planeje em segundos",
    description: "Do sonho ao planejamento completo em poucos cliques."
  }
]

export function Features() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] bg-clip-text text-transparent">
              planejar sua viagem
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Funcionalidades poderosas para tornar seu planejamento simples e rápido
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-card rounded-3xl p-6 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-[#5de0e6]/30"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#5de0e6]/20 to-[#004aad]/20 flex items-center justify-center mb-5 group-hover:from-[#5de0e6] group-hover:to-[#004aad] transition-all duration-300">
                <feature.icon className="w-6 h-6 text-[#004aad] group-hover:text-white transition-colors" />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
