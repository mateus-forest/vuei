"use client"

import type { AppSession } from "@/types/session"
import type { AuthError, AuthOtpResponse, AuthResponse, AuthTokenResponsePassword } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type SignInResult = AuthTokenResponsePassword
type SignUpResult = AuthResponse
type PasswordResetResult = AuthOtpResponse
type SignOutResult = { error: AuthError | null }

function buildMissingEnvError() {
  return {
    name: "SupabaseEnvError",
    message:
      "As variáveis do Supabase não estão configuradas. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local.",
  } as AuthError
}

function normalizeAuthError(error: AuthError | null) {
  if (!error) {
    return null
  }

  const normalizedMessage = error.message.toLowerCase()

  if (normalizedMessage.includes("email not confirmed") || normalizedMessage.includes("email_not_confirmed")) {
    return {
      ...error,
      message: "Confirme seu email antes de entrar.",
    } as AuthError
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return {
      ...error,
      message: "Email ou senha inválidos.",
    } as AuthError
  }

  if (normalizedMessage.includes("signup requires a valid password")) {
    return {
      ...error,
      message: "A senha informada não atende aos requisitos mínimos.",
    } as AuthError
  }

  return error
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin || "http://localhost:3000"
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return {
      data: { session: null, user: null },
      error: buildMissingEnvError(),
    } satisfies SignInResult
  }

  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return {
    ...result,
    error: normalizeAuthError(result.error),
  }
}

export async function signUpWithPassword({
  email,
  password,
  name,
  phone = "",
}: {
  email: string
  password: string
  name: string
  phone?: string
}) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return {
      data: { session: null, user: null },
      error: buildMissingEnvError(),
    } satisfies SignUpResult
  }

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
      },
      emailRedirectTo: getAppUrl(),
    },
  })

  return {
    ...result,
    error: normalizeAuthError(result.error),
  }
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return {
      error: buildMissingEnvError(),
    } satisfies SignOutResult
  }

  return supabase.auth.signOut()
}

export async function sendPasswordReset(email: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: buildMissingEnvError(),
    } satisfies PasswordResetResult
  }

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAppUrl(),
  })
}

export async function getClientSession(): Promise<AppSession> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        isAuthenticated: false,
        role: "guest",
        userId: null,
        email: null,
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    return {
      isAuthenticated: !!session?.user,
      role: "guest",
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
    }
  } catch (error) {
    console.error("Failed to read Supabase client session", error)
    return {
      isAuthenticated: false,
      role: "guest",
      userId: null,
      email: null,
    }
  }
}

// TODO: adicionar refresh controlado e listeners de auth conforme regras de produção.
