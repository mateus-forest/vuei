import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { BrandBadge } from "@/components/ui/brand-badge"
import { GradientButton } from "@/components/ui/gradient-button"
import { SectionShell } from "@/components/ui/section-shell"

export function HeroSection() {
  return (
    <SectionShell className="overflow-hidden pb-16 pt-4 sm:pt-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-28 h-[520px] w-[620px] -translate-x-1/2 rounded-full bg-[#5de0e6]/15 blur-3xl" />
        <div className="absolute left-[18%] top-[42%] h-72 w-72 rounded-full bg-[#004aad]/10 blur-3xl" />
        <div className="absolute right-[14%] top-[36%] h-72 w-72 rounded-full bg-[#5de0e6]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-10 rounded-full bg-[linear-gradient(90deg,#5de0e638,#004aad30)] blur-3xl" />
          <Image
            src="/images/vuei-logo.png"
            alt="VUEI"
            width={720}
            height={282}
            className="relative h-[15rem] w-auto sm:h-[18rem] lg:h-[21rem]"
            priority
          />
        </div>

        <BrandBadge className="mb-6">
          <Sparkles className="size-4 text-[#5de0e6]" />
          App web de descoberta e simulação de viagens com IA
        </BrandBadge>

        <h1 className="font-heading text-4xl font-bold leading-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
          Descubra, simule e planeje sua viagem{" "}
          <span className="bg-[linear-gradient(90deg,#5de0e6,#004aad)] bg-clip-text text-transparent">em segundos</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Clareza para decidir rápido. O VUEI sugere destinos, estima custos e resume o roteiro ideal para você.
        </p>

        <div className="mt-8 flex justify-center">
          <GradientButton asChild size="lg" className="px-8">
            <Link href="/#planejar">
              Escolher como começar
              <ArrowRight className="size-5" />
            </Link>
          </GradientButton>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Mais de <span className="font-semibold text-foreground">10.000 simulações</span> geradas com o VUEI para decidir melhor.
        </p>
      </div>
    </SectionShell>
  )
}
