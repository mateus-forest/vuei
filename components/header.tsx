"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#5de0e6]/10 to-[#004aad]/10 blur-xl rounded-full" />
            <Image
              src="/images/vuei-logo.png"
              alt="vuei logo"
              width={160}
              height={64}
              className="relative h-12 sm:h-14 w-auto drop-shadow-lg"
              priority
            />
          </div>

          <nav className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" className="text-foreground/80 hover:text-foreground">
              Entrar
            </Button>
            <Button 
              className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] text-white hover:opacity-90 transition-opacity shadow-lg shadow-[#004aad]/20"
            >
              Começar
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
