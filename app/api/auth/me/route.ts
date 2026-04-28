import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/services/server-session-service"
import { getCurrentUser } from "@/lib/services/user-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET() {
  const session = await getServerSession()

  if (!session?.isAuthenticated || !session.userId) {
    return NextResponse.json({
      session,
      user: null,
      profile: null,
    })
  }

  const supabase = createSupabaseAdminClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", session.userId)
    .maybeSingle()

  console.log("AUTH USER ID:", session.userId)
  console.log("AUTH USER EMAIL:", session.email)
  console.log("PROFILE QUERY DATA:", profile)
  console.log("PROFILE QUERY ERROR:", error)
  console.log("PROFILE ROLE:", profile?.role)

  const user = await getCurrentUser(session)

  return NextResponse.json({
    session,
    user,
    profile,
  })
}
