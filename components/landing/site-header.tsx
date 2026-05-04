"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Menu, X } from "lucide-react"
import { mainNavigation } from "@/lib/constants/navigation"
import { GradientButton } from "@/components/ui/gradient-button"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function closeMenu() {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="relative flex items-center">
          <div className="absolute -inset-5 rounded-full bg-[linear-gradient(90deg,#5de0e62b,#004aad2b)] blur-2xl" />
          <Image
            src="/images/vuei-logo.png"
            alt="VUEI"
            width={248}
            height={96}
            className="relative h-20 w-auto drop-shadow-lg"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {mainNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-foreground/80 transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost" className="rounded-full px-4 text-foreground/80 hover:text-foreground">
            <Link href="/login">Entrar</Link>
          </Button>
          <GradientButton asChild size="lg" className="h-11 rounded-full px-5 text-sm">
            <Link href="/quiz">
              Começar
              <ArrowRight className="size-4" />
            </Link>
          </GradientButton>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="inline-flex items-center justify-center rounded-full border border-border/60 bg-white/80 p-2 text-foreground transition hover:border-[#5de0e6]/60 md:hidden"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-border/50 bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {mainNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm text-foreground transition hover:border-[#5de0e6]/60"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={closeMenu}
              className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm text-foreground transition hover:border-[#5de0e6]/60"
            >
              Entrar
            </Link>
            <Link
              href="/quiz"
              onClick={closeMenu}
              className="rounded-2xl bg-[linear-gradient(135deg,#5de0e6,#004aad)] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_35px_-18px_rgba(0,74,173,0.75)]"
            >
              Começar
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
