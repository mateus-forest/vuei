import { LayoutDashboard } from "lucide-react"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardHome } from "@/components/dashboard/dashboard-home"
import { SiteFooter } from "@/components/landing/site-footer"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"
import { listUserTravelHistory } from "@/lib/services/search-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { getCurrentUser } from "@/lib/services/user-service"

export default async function DashboardPage() {
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
      <SectionShell className="pt-12">
        <div className="space-y-10">
          <PageIntro
            badge={
              <BrandBadge>
                <LayoutDashboard className="size-4 text-[#5de0e6]" />
                Dashboard
              </BrandBadge>
            }
            title="Seu produto continua daqui."
            description="O dashboard foi desenhado como extensão da landing, não como outro sistema. Mesmo clima, mais continuidade."
          />
          <DashboardHome user={user} searches={searches} />
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
