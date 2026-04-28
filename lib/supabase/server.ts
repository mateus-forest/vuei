import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { assertSupabaseClientEnv, assertSupabaseServiceEnv } from "@/lib/supabase/shared"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = assertSupabaseClientEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookieList) {
        try {
          cookieList.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot always mutate cookies during render.
        }
      },
    },
  })
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = assertSupabaseServiceEnv()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
