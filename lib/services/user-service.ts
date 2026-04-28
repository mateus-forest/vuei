import type { ProfileRow } from "@/types/database"
import type { AppSession } from "@/types/session"
import type { User } from "@/types/user"
import { mockUsers } from "@/lib/mocks/users"
import { INITIAL_BONUS_CREDITS } from "@/lib/services/credit-service"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

function mapProfileToUser(profile: Partial<ProfileRow> & Pick<ProfileRow, "id" | "email">): User {
  return {
    id: profile.id,
    name: profile.full_name ?? profile.name ?? profile.email.split("@")[0] ?? "Usuário VUEI",
    email: profile.email,
    phone: profile.phone ?? "",
    credits: typeof profile.credits === "number" ? profile.credits : INITIAL_BONUS_CREDITS,
    role: profile.role ?? "user",
    freeSearchUsed: profile.free_search_used ?? true,
    planLabel: profile.plan_label ?? "Explorador",
    joinedAt: profile.joined_at ?? new Date().toISOString(),
  }
}

function buildFallbackProfile(session: AppSession): ProfileRow | null {
  if (!session.userId || !session.email) {
    return null
  }

  const baseName = session.email.split("@")[0] || "Usuário VUEI"

  return {
    id: session.userId,
    name: baseName,
    full_name: baseName,
    email: session.email,
    phone: "",
    credits: INITIAL_BONUS_CREDITS,
    role: "user",
    free_search_used: true,
    plan_label: "Explorador",
    joined_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function ensureProfileForSession(session: AppSession, allowBootstrap = true) {
  if (!session.userId || !session.email) {
    return null
  }

  try {
    const adminClient = createSupabaseAdminClient()
    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", session.userId)
      .maybeSingle()

    if (existingProfile && !existingProfileError) {
      return existingProfile as ProfileRow
    }

    if (!allowBootstrap) {
      return buildFallbackProfile(session)
    }

    const minimalPayload = {
      id: session.userId,
      email: session.email,
      credits: INITIAL_BONUS_CREDITS,
      role: "user" as const,
    }

    const { data: createdProfile, error: upsertError } = await adminClient
      .from("profiles")
      .upsert(minimalPayload, { onConflict: "id" })
      .select("*")
      .single()

    if (upsertError || !createdProfile) {
      console.error("PROFILE INSERT ERROR:", {
        message: upsertError?.message,
        details: upsertError?.details,
      })
      return buildFallbackProfile(session)
    }

    return createdProfile as ProfileRow
  } catch (error) {
    console.error("PROFILE INSERT ERROR:", {
      message: error instanceof Error ? error.message : String(error),
      details: null,
    })
    return buildFallbackProfile(session)
  }
}

export async function getUserById(userId: string | null | undefined) {
  if (!userId) return null

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
    const profile = data as ProfileRow | null

    if (error || !profile) {
      return null
    }

    return mapProfileToUser(profile)
  } catch (error) {
    console.error("Failed to fetch user by id", error)
    return null
  }
}

export async function getCurrentUser(session?: AppSession | null, options?: { allowProfileBootstrap?: boolean }) {
  if (!session?.isAuthenticated || !session.userId) return null

  const profile = await ensureProfileForSession(session, options?.allowProfileBootstrap ?? true)
  if (!profile) {
    return null
  }

  return mapProfileToUser(profile)
}

export function listUsers() {
  return mockUsers
}

// TODO: trocar fallback mock por queries reais no admin quando a etapa de banco estiver concluída.
