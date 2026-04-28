"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-[#5de0e6]/10 to-[#004aad]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
          Pronto para descobrir sua{" "}
          <span className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] bg-clip-text text-transparent">
            próxima viagem
          </span>
          ?
        </h2>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Comece agora e deixe a inteligência artificial criar o roteiro perfeito para você.
        </p>

        <Button 
          size="lg"
          className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] text-white text-lg px-10 py-7 rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-[#004aad]/30 hover:shadow-[#004aad]/50 hover:scale-105 group"
        >
          Começar agora
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </section>
  )
}
