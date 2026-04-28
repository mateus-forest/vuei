const clientEnvErrorMessage =
  "Supabase client env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."

const serviceEnvErrorMessage =
  "Supabase server env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return {
    url,
    anonKey,
    serviceRoleKey,
  }
}

export function getSupabaseClientEnvError() {
  const { url, anonKey } = getSupabaseEnv()
  if (!url || !anonKey) {
    return clientEnvErrorMessage
  }

  return null
}

export function assertSupabaseClientEnv() {
  const { url, anonKey } = getSupabaseEnv()
  const errorMessage = getSupabaseClientEnvError()

  if (errorMessage) {
    throw new Error(errorMessage)
  }

  return { url: url as string, anonKey: anonKey as string }
}

export function assertSupabaseServiceEnv() {
  const { url, serviceRoleKey } = getSupabaseEnv()

  if (!url || !serviceRoleKey) {
    throw new Error(serviceEnvErrorMessage)
  }

  return { url: url as string, serviceRoleKey: serviceRoleKey as string }
}
