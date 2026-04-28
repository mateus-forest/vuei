"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"

const suggestions = [
  "Praias paradisíacas no Nordeste",
  "Roteiro cultural na Europa",
  "Aventura na Patagônia",
  "Lua de mel no Caribe",
  "Viagem em família para Disney",
]

export function Hero() {
  const [query, setQuery] = useState("")

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#5de0e6]/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[#004aad]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[#5de0e6]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div className="relative flex items-center justify-center mb-12">
          <div className="absolute -inset-8 bg-gradient-to-r from-[#5de0e6]/25 to-[#004aad]/25 blur-3xl rounded-full" />
          <div className="absolute -inset-4 bg-gradient-to-r from-[#5de0e6]/15 to-[#004aad]/15 blur-2xl rounded-full animate-pulse" />
          <Image
            src="/images/vuei-logo.png"
            alt="vuei"
            width={400}
            height={160}
            className="relative h-32 sm:h-40 lg:h-48 w-auto drop-shadow-2xl"
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance mb-4">
          Descubra sua próxima viagem{" "}
          <span className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] bg-clip-text text-transparent">
            em segundos
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty">
          Simule destinos, custos e roteiros com inteligência artificial
        </p>

        {/* Main AI Input - Hero Element */}
        <div className="relative max-w-3xl mx-auto mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#5de0e6] to-[#004aad] rounded-3xl blur-lg opacity-30" />
          <div className="relative bg-card rounded-2xl shadow-2xl border border-border/50 p-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5de0e6]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Quero viajar para Itália com minha família em julho gastando até R$5.000"
                  className="w-full pl-12 pr-4 py-4 sm:py-5 text-base sm:text-lg bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] text-white text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-5 h-auto rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#004aad]/20 hover:shadow-xl hover:shadow-[#004aad]/30 hover:scale-[1.02] flex items-center gap-2 whitespace-nowrap"
              >
                Descobrir viagem
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-2xl mx-auto">
          <span className="text-sm text-muted-foreground">Sugestões:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 text-sm bg-card hover:bg-secondary border border-border/50 rounded-full text-foreground transition-all hover:border-[#5de0e6]/50 hover:shadow-md cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Subtle secondary CTA */}
        <p className="mt-12 text-sm text-muted-foreground">
          Mais de <span className="font-semibold text-foreground">10.000</span> viagens planejadas com IA
        </p>
      </div>
    </section>
  )
}
