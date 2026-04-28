import { Compass } from "lucide-react"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SiteFooter } from "@/components/landing/site-footer"
import { ResultView } from "@/components/trip/result-view"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"
import { getServerSession } from "@/lib/services/server-session-service"
import { getTravelHistoryItem, listUserTravelHistory } from "@/lib/services/search-service"
import { getCurrentUser } from "@/lib/services/user-service"

export default async function DashboardResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getServerSession()
  if (!session?.isAuthenticated) {
    redirect("/login")
  }

  const user = await getCurrentUser(session)
  if (!user) {
    redirect("/login")
  }

  const params = await searchParams
  const searches = await listUserTravelHistory(user.id)
  const tripId = typeof params.tripId === "string" ? params.tripId : ""

  if (!tripId) {
    redirect("/dashboard")
  }

  const historyItem = await getTravelHistoryItem(tripId, user.id)

  if (!historyItem) {
    redirect("/dashboard")
  }

  const source = historyItem.origin === "quiz" ? "quiz" : historyItem.origin === "sugestao" ? "suggestion" : "text"
  const description =
    source === "quiz" ? "Baseado nas suas respostas do quiz" : `Baseado na sua busca: ${historyItem.input}`

  return (
    <main className="min-h-screen">
      <DashboardHeader user={user} searches={searches} />
      <SectionShell className="overflow-hidden pt-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-24 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[#5de0e6]/12 blur-3xl" />
        </div>
        <div className="relative space-y-10">
          <PageIntro
            badge={
              <BrandBadge>
                <Compass className="size-4 text-[#5de0e6]" />
                Resultado da simulação
              </BrandBadge>
            }
            title="Veja a viagem sugerida e decida com mais clareza."
            description={description}
          />
          <ResultView result={historyItem.result} input={historyItem.input} loggedIn source={source} suggestion="" />
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
