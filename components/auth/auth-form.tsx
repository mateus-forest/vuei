"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { ArrowRight, LockKeyhole, Mail, User2 } from "lucide-react"
import { BrandCard } from "@/components/ui/brand-card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GradientButton } from "@/components/ui/gradient-button"
import { clearPendingTripRequest, readPendingTripRequest } from "@/lib/services/pending-trip-service"
import { clearPostAuthRedirect, readPostAuthRedirect } from "@/lib/services/post-auth-redirect-service"
import { sendPasswordReset, signInWithPassword, signUpWithPassword } from "@/lib/services/session-service"

type BootstrapProfileResponse =
  | { ok: true; data: { profileId: string } }
  | { ok: false; error: string; detail?: string }

type TripGenerationApiResponse =
  | { ok: true; data: { persisted: boolean; tripId?: string; remainingCredits?: number; result?: unknown } }
  | { ok: false; error: string; code?: string }

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login"
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [recoveryFeedback, setRecoveryFeedback] = useState("")
  const [authError, setAuthError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function readJsonResponse(response: Response) {
    const contentType = response.headers.get("content-type") || ""
    const rawBody = await response.text()

    if (!rawBody.trim()) {
      return null
    }

    if (!contentType.includes("application/json")) {
      console.error("Expected JSON response but received:", contentType, rawBody)
      return null
    }

    try {
      return JSON.parse(rawBody) as TripGenerationApiResponse
    } catch (error) {
      console.error("Failed to parse resumed trip generation response JSON", error, rawBody)
      return null
    }
  }

  async function bootstrapProfile(name: string) {
    const response = await fetch("/api/auth/bootstrap-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    })

    const payload = (await response.json().catch(() => null)) as BootstrapProfileResponse | null

    if (!response.ok || !payload?.ok) {
      throw new Error((payload && !payload.ok && payload.error) || "Não foi possível preparar o perfil do usuário.")
    }
  }

  async function resolvePostAuthDestination(userId: string, userEmail: string | null | undefined) {
    const nextFromQuery = searchParams.get("next")
    const storedDestination = readPostAuthRedirect()

    if (nextFromQuery?.startsWith("/") && !nextFromQuery.startsWith("//")) {
      return nextFromQuery
    }

    if (storedDestination) {
      clearPostAuthRedirect()
      return storedDestination
    }

    const authUser = { id: userId, email: userEmail ?? null }

    console.log("AUTH USER:", authUser)
    console.log("USER ID:", userId)
    console.log("USER EMAIL:", userEmail ?? null)

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            session?: { userId?: string | null; email?: string | null } | null
            profile?: { id?: string; email?: string; role?: string } | null
          }
        | null

      const profile = payload?.profile ?? null

      console.log("PROFILE RESULT:", profile)
      console.log("ROLE:", profile?.role)

      if (!response.ok) {
        console.error("PROFILE QUERY ERROR:", payload)
        console.log("REDIRECT TARGET:", "/dashboard")
        return "/dashboard"
      }

      if (!profile) {
        console.error("PROFILE NOT FOUND FOR USER:", userId)
        console.log("REDIRECT TARGET:", "/dashboard")
        return "/dashboard"
      }

      const target = profile.role === "admin" ? "/admin" : "/dashboard"

      console.log("REDIRECT TARGET:", target)

      return target
    } catch (error) {
      console.error("PROFILE QUERY ERROR:", error)
      console.log("REDIRECT TARGET:", "/dashboard")
      return "/dashboard"
    }
  }

  function goToDestination(destination: string) {
    window.location.assign(destination)
  }

  async function resumePendingTripGeneration() {
    const pendingTripRequest = readPendingTripRequest()

    if (!pendingTripRequest) {
      return null
    }

    const response = await fetch("/api/ai/generate-trip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pendingTripRequest.payload),
    })

    const payload = await readJsonResponse(response)

    if (!response.ok || !payload?.ok) {
      const message =
        payload && !payload.ok ? payload.error : "Sua conta foi autenticada, mas não foi possível gerar a viagem agora."
      throw new Error(message)
    }

    clearPendingTripRequest()

    const separator = pendingTripRequest.redirectTo.includes("?") ? "&" : "?"

    if (payload.data.tripId) {
      return `${pendingTripRequest.redirectTo}${separator}tripId=${encodeURIComponent(payload.data.tripId)}`
    }

    if (pendingTripRequest.flow === "quiz") {
      const query = new URLSearchParams(pendingTripRequest.payload.quizAnswers).toString()
      return `${pendingTripRequest.redirectTo}${separator}source=quiz&${query}`
    }

    return `${pendingTripRequest.redirectTo}${separator}input=${encodeURIComponent(pendingTripRequest.payload.input)}&source=${pendingTripRequest.payload.origin}`
  }

  async function handlePrimaryAction() {
    setIsSubmitting(true)
    setAuthError("")

    try {
      if (isLogin) {
        const { data, error } = await signInWithPassword(form.email, form.password)

        if (error) {
          setAuthError(error.message)
          return
        }

        if (!data.user || !data.session) {
          setAuthError("Não foi possível iniciar a sessão.")
          return
        }

        try {
          await bootstrapProfile(data.user.user_metadata?.name ?? form.name)
        } catch (bootstrapError) {
          console.error("Profile bootstrap failed after login", bootstrapError)
        }

        const pendingDestination = await resumePendingTripGeneration().catch((resumeError) => {
          console.error("Failed to resume pending trip generation after login", resumeError)
          throw resumeError
        })

        if (pendingDestination) {
          goToDestination(pendingDestination)
          return
        }

        goToDestination(await resolvePostAuthDestination(data.user.id, data.user.email))
        return
      }

      const { data, error } = await signUpWithPassword({
        email: form.email,
        password: form.password,
        name: form.name,
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      if (!data.user) {
        setAuthError("Não foi possível criar a conta.")
        return
      }

      if (!data.session) {
        setAuthError("Conta criada. Confirme seu e-mail antes de entrar.")
        return
      }

      try {
        await bootstrapProfile(form.name)
      } catch (bootstrapError) {
        console.error("Profile bootstrap failed after signup", bootstrapError)
      }

      const pendingDestination = await resumePendingTripGeneration().catch((resumeError) => {
        console.error("Failed to resume pending trip generation after signup", resumeError)
        throw resumeError
      })

      if (pendingDestination) {
        goToDestination(pendingDestination)
        return
      }

      goToDestination(await resolvePostAuthDestination(data.user.id, data.user.email))
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSendRecoveryInstructions() {
    setRecoveryFeedback("")
    const { error } = await sendPasswordReset(recoveryEmail)

    if (error) {
      setRecoveryFeedback(error.message)
      return
    }

    setRecoveryFeedback("Enviamos as instruções de recuperação para o seu e-mail.")
  }

  return (
    <>
      <BrandCard glow className="p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">{isLogin ? "Entrar no VUEI" : "Criar sua conta"}</h1>
          <p className="mt-3 text-muted-foreground">
            {isLogin
              ? "Continue de onde parou e acompanhe seu histórico de viagens."
              : "Ative o fluxo completo do produto, salve resultados e use seus créditos."}
          </p>
        </div>

        <div className="space-y-4">
          {!isLogin ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Nome</span>
              <div className="relative">
                <User2 className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 pl-11 pr-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                  placeholder="Seu nome"
                />
              </div>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">E-mail</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 pl-11 pr-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                placeholder="você@email.com"
                type="email"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">Senha</span>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 pl-11 pr-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                placeholder="Sua senha"
                type="password"
              />
            </div>
          </label>

          {isLogin ? (
            <button
              type="button"
              onClick={() => {
                setRecoveryEmail(form.email)
                setRecoveryFeedback("")
                setIsForgotPasswordOpen(true)
              }}
              className="text-sm font-medium text-[#004aad] transition hover:opacity-80"
            >
              Esqueci minha senha
            </button>
          ) : null}

          <GradientButton size="lg" className="mt-2 w-full" onClick={() => void handlePrimaryAction()} disabled={isSubmitting}>
            {isSubmitting ? "Processando..." : isLogin ? "Entrar e continuar" : "Criar conta"}
            <ArrowRight className="size-5" />
          </GradientButton>

          {authError ? <p className="text-sm text-[#004aad]">{authError}</p> : null}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {isLogin ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <Link
            href={
              isLogin
                ? `/cadastro${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next") ?? "")}` : ""}`
                : `/login${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next") ?? "")}` : ""}`
            }
            className="font-medium text-[#004aad] transition hover:opacity-80"
          >
            {isLogin ? "Criar agora" : "Entrar"}
          </Link>
        </p>
      </BrandCard>

      <Dialog
        open={isForgotPasswordOpen}
        onOpenChange={(open) => {
          setIsForgotPasswordOpen(open)
          if (!open) {
            setRecoveryFeedback("")
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Esqueci minha senha</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Informe seu e-mail para receber as instruções de recuperação.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">E-mail</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 pl-11 pr-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                    placeholder="você@email.com"
                    type="email"
                  />
                </div>
              </label>

              {recoveryFeedback ? <p className="text-sm text-muted-foreground">{recoveryFeedback}</p> : null}
            </div>

            <DialogFooter className="mt-6 gap-3 sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(false)
                  setRecoveryFeedback("")
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Cancelar
              </button>
              <GradientButton size="lg" className="sm:w-auto" onClick={() => void handleSendRecoveryInstructions()}>
                Enviar instruções
                <ArrowRight className="size-5" />
              </GradientButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
