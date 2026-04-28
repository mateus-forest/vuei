"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { assertSupabaseClientEnv, getSupabaseClientEnvError } from "@/lib/supabase/shared"

let browserClient: SupabaseClient | null = null
let hasLoggedMissingEnv = false

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const envError = getSupabaseClientEnvError()
  if (envError) {
    if (!hasLoggedMissingEnv) {
      console.error(`${envError} Create a .env.local file in the project root and restart npm run dev.`)
      hasLoggedMissingEnv = true
    }
    return null
  }

  const { url, anonKey } = assertSupabaseClientEnv()
  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}
