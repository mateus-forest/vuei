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
}

function buildEditState(ticket: SupportTicket): SupportEditState {
  return {
    status: ticket.status,
    priority: ticket.priority,
    adminNote: ticket.adminNote ?? "",
  }
}

export function AdminSupportCard({ support }: { support: AdminSupportData }) {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [editState, setEditState] = useState<SupportEditState | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function openTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket)
    setEditState(buildEditState(ticket))
    setFeedbackMessage("")
  }

  async function handleSave() {
    if (!selectedTicket || !editState) {
      return
    }

    setFeedbackMessage("")

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
        }),
      })

      const payload = (await response.json().catch(() => null)) as AdminSupportActionResponse | null

      if (!response.ok || !payload?.ok) {
        setFeedbackMessage((payload && !payload.ok && payload.error) || "Não foi possível atualizar o chamado agora.")
        return
      }

      startTransition(() => {
        router.refresh()
      })
      setSelectedTicket(null)
      setEditState(null)
    } catch (error) {
      console.error("ADMIN SUPPORT UPDATE ERROR", error)
      setFeedbackMessage("Não foi possível atualizar o chamado agora.")
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
            <div className="text-sm text-muted-foreground">Em análise</div>
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
        <DialogContent className="max-w-2xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading text-2xl text-foreground">
                <Ticket className="size-5 text-[#004aad]" />
                Atualizar chamado
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Ajuste o status, a prioridade e a observação interna do atendimento.
              </DialogDescription>
            </DialogHeader>

            {selectedTicket && editState ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{selectedTicket.email ?? "Sem e-mail"}</div>
                  <div className="mt-1">{getSupportTicketCategoryLabel(selectedTicket.category)}</div>
                  <div className="mt-2 text-foreground">{selectedTicket.message}</div>
                </div>

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
                  <span className="mb-2 block text-sm font-medium text-foreground">Nota interna</span>
                  <Textarea
                    value={editState.adminNote}
                    maxLength={2000}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, adminNote: event.target.value } : current))
                    }
                    className="min-h-28"
                    placeholder="Observações internas para acompanhamento do caso."
                  />
                </label>

                {feedbackMessage ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {feedbackMessage}
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter className="mt-6">
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
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Salvando..." : "Salvar atualização"}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
