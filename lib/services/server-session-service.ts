import type { AppSession, SessionRole } from "@/types/session"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export async function getServerSession(options?: { includeRole?: boolean }): Promise<AppSession | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    let role: SessionRole = "user"

    if (options?.includeRole) {
      try {
        const adminClient = createSupabaseAdminClient()
        const { data: profile, error } = await adminClient
          .from("profiles")
          .select("id, email, role")
          .eq("id", user.id)
          .maybeSingle()

        console.log("AUTH USER ID:", user.id)
        console.log("AUTH USER EMAIL:", user.email ?? null)
        console.log("PROFILE QUERY DATA:", profile)
        console.log("PROFILE QUERY ERROR:", error)
        console.log("PROFILE ROLE:", profile?.role)

        if (profile?.role === "admin") {
          role = "admin"
        }
      } catch (error) {
        console.error("Failed to read profile role from Supabase session", error)
      }
    }

    return {
      isAuthenticated: true,
      role,
      userId: user.id,
      email: user.email ?? null,
    }
  } catch (error) {
    const digest =
      typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string"
        ? error.digest
        : ""

    if (digest !== "DYNAMIC_SERVER_USAGE") {
      console.error("Failed to read Supabase session", error)
    }
    return null
  }
}
