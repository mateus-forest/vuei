import { Sparkles } from "lucide-react"
import { QuizForm } from "@/components/quiz/quiz-form"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"

export default async function QuizPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <SectionShell className="overflow-hidden pt-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-24 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[#5de0e6]/12 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl space-y-10">
          <PageIntro
            badge={
              <BrandBadge>
                <Sparkles className="size-4 text-[#5de0e6]" />
                Quiz rápido
              </BrandBadge>
            }
            title="Descubra um destino sem perder tempo."
            description="O quiz continua a experiência da landing com o mesmo tom: poucas escolhas, leitura fácil e uma sugestão simulada no final."
          />
          <QuizForm redirectTo="/resultado" enforceFreeSearchLimit />
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
