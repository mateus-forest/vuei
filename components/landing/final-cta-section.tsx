import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GradientButton } from "@/components/ui/gradient-button"
import { SectionShell } from "@/components/ui/section-shell"

export function FinalCtaSection() {
  return (
    <SectionShell className="overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#5de0e61c,#004aad1c)] blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
          Pronto para descobrir sua{" "}
          <span className="bg-[linear-gradient(90deg,#5de0e6,#004aad)] bg-clip-text text-transparent">proxima viagem</span>?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Comece com uma busca gratuita, valide a ideia em segundos e siga com login quando quiser continuar.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <GradientButton asChild size="lg" className="px-8">
            <Link href="/resultado?input=quero%20viajar%20para%20europa%20com%205%20mil%20reais">
              Gerar simulacao
              <ArrowRight className="size-5" />
            </Link>
          </GradientButton>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-6 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
          >
            Ver dashboard
          </Link>
        </div>
      </div>
    </SectionShell>
  )
}
