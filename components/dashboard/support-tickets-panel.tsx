"use client"

import { type FormEvent, useEffect, useState } from "react"
import { AlertCircle, LifeBuoy, MessageSquareText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supportTicketCategories } from "@/lib/services/support-service"
import {
  getSupportTicketCategoryLabel,
  getSupportTicketStatusLabel,
} from "@/lib/utils/support-ticket-labels"
import { formatShortDate } from "@/lib/utils/format"
import type { SupportTicketRow } from "@/types/database"
import type { SupportTicketCategory } from "@/types/support"

type SupportTicketsResponse =
  | { ok: true; data: SupportTicketRow[] }
  | { ok: false; error: string; detail?: string }
  | null

const initialForm = {
  category: "other" as SupportTicketCategory,
  subject: "",
  message: "",
}

export function SupportTicketsPanel({ isOpen }: { isOpen: boolean }) {
  const [form, setForm] = useState(initialForm)
  const [tickets, setTickets] = useState<SupportTicketRow[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  async function loadTickets(options?: { clearError?: boolean }) {
    if (options?.clearError) {
      setErrorMessage("")
    }

    try {
      const response = await fetch("/api/support/tickets", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as SupportTicketsResponse

      if (!response.ok || !payload?.ok) {
        setErrorMessage((payload && !payload.ok && payload.error) || "Não foi possível carregar seus chamados agora.")
        setTickets([])
        return
      }

      setTickets(payload.data)
    } catch (error) {
      console.error("SUPPORT TICKETS LOAD ERROR", error)
      setErrorMessage("Não foi possível carregar seus chamados agora.")
      setTickets([])
    } finally {
      setHasLoaded(true)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadTickets()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const payload = (await response.json().catch(() => null)) as SupportTicketsResponse

      if (!response.ok || !payload?.ok) {
        setErrorMessage((payload && !payload.ok && payload.error) || "Não foi possível enviar seu chamado agora.")
        return
      }

      setForm(initialForm)
      setSuccessMessage("Chamado enviado com sucesso. Nossa equipe vai analisar o caso.")
      await loadTickets({ clearError: true })
    } catch (error) {
      console.error("SUPPORT TICKET CREATE ERROR", error)
      setErrorMessage("Não foi possível enviar seu chamado agora.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-white/80 px-5 py-5">
      <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <LifeBuoy className="size-5 text-[#004aad]" />
        Abrir chamado
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Descreva o problema para que possamos analisar sua conta, créditos, pagamento ou roteiro.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground">Categoria</span>
          <select
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value as SupportTicketCategory }))
            }
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/50"
          >
            {supportTicketCategories.map((category) => (
              <option key={category} value={category}>
                {getSupportTicketCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground">Assunto</span>
          <Input
            value={form.subject}
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            placeholder="Resumo rapido do problema"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground">Mensagem</span>
          <Textarea
            value={form.message}
            maxLength={2000}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            placeholder="Explique o que aconteceu, quando ocorreu e o que voce esperava ver."
            className="min-h-28"
          />
        </label>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
        ) : null}
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Enviando..." : "Enviar chamado"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <AlertCircle className="size-5 text-[#004aad]" />
          Meus chamados
        </div>

        <div className="mt-4 space-y-3">
          {!hasLoaded ? (
            <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
              Carregando chamados...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
              Você ainda não possui chamados.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-border/60 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{ticket.subject?.trim() || "Chamado sem assunto"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {getSupportTicketCategoryLabel(ticket.category)} • {getSupportTicketStatusLabel(ticket.status)} •{" "}
                      {formatShortDate(ticket.created_at)}
                    </div>
                    {ticket.customer_message ? (
                      <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/35 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <MessageSquareText className="size-4 text-[#004aad]" />
                          Resposta do suporte
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{ticket.customer_message}</div>
                        {ticket.customer_message_at ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {formatShortDate(ticket.customer_message_at)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
