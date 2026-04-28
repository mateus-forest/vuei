import { redirect } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminPanel } from "@/components/admin/admin-panel"
import { SectionShell } from "@/components/ui/section-shell"
import { getAdminPanelData } from "@/lib/services/admin-service"
import { getServerSession } from "@/lib/services/server-session-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/services/user-service"

export default async function AdminPage() {
  const session = await getServerSession()
  if (!session?.isAuthenticated) {
    redirect("/login")
  }

  const supabase = createSupabaseAdminClient()
  const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("id", session.userId).maybeSingle()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  const user = await getCurrentUser(session)
  if (!user) {
    redirect("/login")
  }

  const { users, searches, purchases, creditTransactions } = await getAdminPanelData()

  return (
    <main className="min-h-screen bg-background">
      <AdminHeader />
      <SectionShell className="pt-10">
        <AdminPanel users={users} searches={searches} purchases={purchases} creditTransactions={creditTransactions} />
      </SectionShell>
    </main>
  )
}
