"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { mainNavigation } from "@/lib/constants/navigation"
import { GradientButton } from "@/components/ui/gradient-button"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
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

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="rounded-full px-4 text-foreground/80 hover:text-foreground">
            <Link href="/login">Entrar</Link>
          </Button>
          <GradientButton asChild size="lg" className="h-11 rounded-full px-5 text-sm">
            <Link href="/quiz">
              Comecar
              <ArrowRight className="size-4" />
            </Link>
          </GradientButton>
        </div>
      </div>
    </header>
  )
}
