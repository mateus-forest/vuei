import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "admin@vuei.com"
const ADMIN_PASSWORD = "12345678"
const ADMIN_CREDITS = 999

let ensureAdminUserPromise: Promise<void> | null = null

export function ensureAdminUserOnce() {
  if (!ensureAdminUserPromise) {
    ensureAdminUserPromise = ensureAdminUser()
  }

  return ensureAdminUserPromise
}

export async function ensureAdminUser() {
  try {
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      console.error("ADMIN LIST ERROR:", listError)
      return
    }

    const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL)

    if (existingUser) {
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      })

      if (updateUserError) {
        console.error("ADMIN UPDATE ERROR:", updateUserError)
      }

      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: existingUser.id,
        email: ADMIN_EMAIL,
        role: "admin",
        credits: ADMIN_CREDITS,
      })

      if (profileError) {
        console.error("ADMIN PROFILE UPSERT ERROR:", profileError)
      }

      return
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })

    if (createError) {
      console.error("ADMIN CREATE ERROR:", createError)
      return
    }

    if (!createdUser.user) {
      console.error("ADMIN CREATE ERROR:", new Error("Supabase did not return the created admin user."))
      return
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: createdUser.user.id,
      email: ADMIN_EMAIL,
      role: "admin",
      credits: ADMIN_CREDITS,
    })

    if (profileError) {
      console.error("ADMIN PROFILE UPSERT ERROR:", profileError)
    }
  } catch (error) {
    console.error("ADMIN ENSURE ERROR:", error)
  }
}
