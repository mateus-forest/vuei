"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Headset, Ticket } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { type AdminSupportData } from "@/lib/services/admin-service"
import { supportTicketPriorities, supportTicketStatuses } from "@/lib/services/support-service"
import {
  getSupportTicketCategoryLabel,
  getSupportTicketPriorityLabel,
  getSupportTicketStatusLabel,
  summarizeSupportTicketMessage,
} from "@/lib/utils/support-ticket-labels"
import { formatShortDate } from "@/lib/utils/format"
import type { SupportTicket } from "@/types/support"
import { BrandCard } from "@/components/ui/brand-card"

type AdminSupportActionResponse = { ok: true; data?: unknown } | { ok: false; error: string }

type SupportEditState = {
  status: SupportTicket["status"]
  priority: SupportTicket["priority"]
  adminNote: string
  customerMessage: string
  courtesyCredits: string
}

function buildEditState(ticket: SupportTicket): SupportEditState {
  return {
    status: ticket.status,
    priority: ticket.priority,
    adminNote: ticket.adminNote ?? "",
    customerMessage: ticket.customerMessage ?? "",
    courtesyCredits: "",
  }
}

function formatResolvedDate(ticket: SupportTicket) {
  return ticket.customerMessageAt ? formatShortDate(ticket.customerMessageAt) : null
}

export function AdminSupportCard({ support }: { support: AdminSupportData }) {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [editState, setEditState] = useState<SupportEditState | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function openTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket)
    setEditState(buildEditState(ticket))
    setFeedbackMessage("")
  }

  async function handleSave() {
    if (!selectedTicket || !editState || isSaving) {
      return
    }

    const courtesyCredits = editState.courtesyCredits.trim()
    const parsedCourtesyCredits = courtesyCredits ? Number.parseInt(courtesyCredits, 10) : null

    if (
      courtesyCredits &&
      (parsedCourtesyCredits === null || !Number.isInteger(parsedCourtesyCredits) || parsedCourtesyCredits <= 0)
    ) {
      setFeedbackMessage("Informe uma quantidade valida de creditos de cortesia.")
      return
    }

    setFeedbackMessage("")
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: editState.status,
          priority: editState.priority,
          admin_note: editState.adminNote,
          customer_message: editState.customerMessage,
          courtesy_credits: parsedCourtesyCredits,
        }),
      })

      const payload = (await response.json().catch(() => null)) as AdminSupportActionResponse | null

      if (!response.ok || !payload?.ok) {
        setFeedbackMessage((payload && !payload.ok && payload.error) || "Nao foi possivel atualizar o chamado agora.")
        return
      }

      startTransition(() => {
        router.refresh()
      })
      setSelectedTicket(null)
      setEditState(null)
    } catch (error) {
      console.error("ADMIN SUPPORT UPDATE ERROR", error)
      setFeedbackMessage("Nao foi possivel atualizar o chamado agora.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <BrandCard className="p-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Headset className="size-5 text-[#004aad]" />
            Chamados
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
            <div className="text-sm text-muted-foreground">Abertos</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{support.openCount}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
            <div className="text-sm text-muted-foreground">Em analise</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{support.inReviewCount}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4">
            <div className="text-sm text-muted-foreground">Resolvidos</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{support.resolvedCount}</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {support.recentTickets.length === 0 ? (
            <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
              Nenhum chamado encontrado.
            </div>
          ) : (
            support.recentTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-border/60 px-4 py-4">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.6fr_1.3fr_0.6fr] lg:items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">{ticket.email ?? "Sem e-mail"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{ticket.subject?.trim() || "Chamado sem assunto"}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{getSupportTicketCategoryLabel(ticket.category)}</div>
                  <div className="text-sm text-muted-foreground">{getSupportTicketStatusLabel(ticket.status)}</div>
                  <div className="text-sm text-muted-foreground">{formatShortDate(ticket.createdAt)}</div>
                  <div className="text-sm text-muted-foreground">{summarizeSupportTicketMessage(ticket)}</div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => openTicket(ticket)}
                      className="rounded-full border border-border/60 bg-white/80 px-3 py-2 text-xs font-medium text-foreground transition hover:border-[#5de0e6]/60"
                    >
                      Atualizar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </BrandCard>

      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null)
            setEditState(null)
            setFeedbackMessage("")
          }
        }}
      >
        <DialogContent className="flex max-h-[85dvh] max-w-2xl flex-col overflow-hidden rounded-[28px] border-border/60 bg-background p-0 shadow-2xl sm:max-h-[90dvh]">
          <div className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 px-6 pt-6 sm:px-7 sm:pt-7">
              <DialogTitle className="flex items-center gap-2 font-heading text-2xl text-foreground">
                <Ticket className="size-5 text-[#004aad]" />
                Atualizar chamado
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Ajuste o atendimento, responda o cliente e aplique cortesia apenas quando necessario.
              </DialogDescription>
            </DialogHeader>

            {selectedTicket && editState ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
                <div className="space-y-4 pb-4">
                <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{selectedTicket.email ?? "Sem e-mail"}</div>
                  <div className="mt-1">{getSupportTicketCategoryLabel(selectedTicket.category)}</div>
                  <div className="mt-1">{selectedTicket.subject?.trim() || "Chamado sem assunto"}</div>
                  <div className="mt-2 text-foreground">{selectedTicket.message}</div>
                </div>

                {selectedTicket.customerMessage ? (
                  <div className="rounded-2xl border border-border/60 bg-secondary/35 px-4 py-4 text-sm">
                    <div className="font-medium text-foreground">Resposta do suporte atual</div>
                    <div className="mt-2 whitespace-pre-wrap text-foreground">{selectedTicket.customerMessage}</div>
                    {formatResolvedDate(selectedTicket) ? (
                      <div className="mt-2 text-xs text-muted-foreground">{formatResolvedDate(selectedTicket)}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">Status</span>
                    <select
                      value={editState.status}
                      onChange={(event) =>
                        setEditState((current) => (current ? { ...current, status: event.target.value as SupportTicket["status"] } : current))
                      }
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                    >
                      {supportTicketStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getSupportTicketStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">Prioridade</span>
                    <select
                      value={editState.priority}
                      onChange={(event) =>
                        setEditState((current) =>
                          current ? { ...current, priority: event.target.value as SupportTicket["priority"] } : current,
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                    >
                      {supportTicketPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {getSupportTicketPriorityLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">Mensagem para o cliente</span>
                  <Textarea
                    value={editState.customerMessage}
                    maxLength={2000}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, customerMessage: event.target.value } : current))
                    }
                    className="min-h-28"
                    placeholder="Exemplo: Identificamos o problema e liberamos seus creditos."
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">Nota interna</span>
                  <Textarea
                    value={editState.adminNote}
                    maxLength={2000}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, adminNote: event.target.value } : current))
                    }
                    className="min-h-28"
                    placeholder="Observacoes internas para acompanhamento do caso."
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">Adicionar credito de cortesia</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={editState.courtesyCredits}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, courtesyCredits: event.target.value } : current))
                    }
                    className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                    placeholder="Exemplo: 1"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Os creditos so serao aplicados se voce preencher uma quantidade positiva e salvar.
                  </p>
                </label>

                {feedbackMessage ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {feedbackMessage}
                  </div>
                ) : null}
              </div>
              </div>
            ) : null}

            <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-6 py-4 sm:px-7">
              <button
                type="button"
                onClick={() => {
                  setSelectedTicket(null)
                  setEditState(null)
                  setFeedbackMessage("")
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isPending}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving || isPending ? "Salvando..." : "Salvar atualizacao"}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
