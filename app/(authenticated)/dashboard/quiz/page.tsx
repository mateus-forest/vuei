import { Sparkles } from "lucide-react"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { QuizForm } from "@/components/quiz/quiz-form"
import { SiteFooter } from "@/components/landing/site-footer"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"
import { getServerSession } from "@/lib/services/server-session-service"
import { listUserTravelHistory } from "@/lib/services/search-service"
import { getCurrentUser } from "@/lib/services/user-service"

export default async function DashboardQuizPage() {
  const session = await getServerSession()
  if (!session?.isAuthenticated) {
    redirect("/login")
  }

  const user = await getCurrentUser(session)
  if (!user) {
    redirect("/login")
  }

  const searches = await listUserTravelHistory(user.id)

  return (
    <main className="min-h-screen">
      <DashboardHeader user={user} searches={searches} />
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
            description="O quiz continua a experiência do dashboard com o mesmo tom: poucas escolhas, leitura fácil e uma sugestão simulada no final."
          />
          <QuizForm redirectTo="/dashboard/resultado" />
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
