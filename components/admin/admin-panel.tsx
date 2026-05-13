"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Search, ShieldCheck, Users, Wallet } from "lucide-react"
import { AdminSupportCard } from "@/components/admin/admin-support-card"
import { creditPackages } from "@/lib/constants/credit-packages"
import type { CreditTransactionRow } from "@/types/database"
import { formatShortDate } from "@/lib/utils/format"
import type { Search as SearchItem } from "@/types/search"
import type { User } from "@/types/user"
import type { AdminFinanceData, AdminPurchase, AdminSupportData } from "@/lib/services/admin-service"
import { BrandCard } from "@/components/ui/brand-card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type AdminUser = User & {
  backendStatus: "active" | "blocked"
  statusLabel: "ativo" | "inativo"
  totalSearches: number
}

type AdminActionResponse = { ok: true; data?: unknown } | { ok: false; error: string }

function resolveSearchOrigin(origin: SearchItem["origin"]) {
  if (origin === "quiz") return "quiz"
  if (origin === "sugestao") return "sugestão"
  return "busca"
}

async function readJsonResponse(response: Response) {
  const rawBody = await response.text()

  if (!rawBody.trim()) {
    return null
  }

  try {
    return JSON.parse(rawBody) as AdminActionResponse
  } catch (error) {
    console.error("Failed to parse admin action response", error, rawBody)
    return null
  }
}

export function AdminPanel({
  users,
  searches,
  purchases,
  creditTransactions,
  finance,
  support,
}: {
  users: User[]
  searches: SearchItem[]
  purchases: AdminPurchase[]
  creditTransactions: CreditTransactionRow[]
  finance: AdminFinanceData
  support: AdminSupportData
}) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const adminUsers: AdminUser[] = users.map((user) => {
    const backendStatus = user.status === "blocked" ? "blocked" : "active"

    return {
      ...user,
      backendStatus,
      statusLabel: backendStatus === "blocked" ? "inativo" : "ativo",
      totalSearches: searches.filter((search) => search.userId === user.id).length,
    }
  })

  const consumedCredits = creditTransactions
    .filter((transaction) => transaction.credits < 0)
    .reduce((accumulator, transaction) => accumulator + Math.abs(transaction.credits), 0)

  const estimatedRevenue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(finance.estimatedRevenueCents / 100)

  async function handleAddCredits(user: AdminUser) {
    const rawCredits = window.prompt("Quantidade de créditos para adicionar:", "5")

    if (rawCredits === null) {
      return
    }

    const credits = Number(rawCredits)

    if (!Number.isInteger(credits) || credits <= 0) {
      window.alert("Informe uma quantidade válida de créditos.")
      return
    }

    try {
      const response = await fetch("/api/admin/add-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          credits,
        }),
      })

      const payload = await readJsonResponse(response)

      if (!response.ok || !payload?.ok) {
        window.alert(payload && !payload.ok ? payload.error : "Não foi possível adicionar créditos agora.")
        return
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error("Admin add credits request failed", error)
      window.alert("Não foi possível adicionar créditos agora.")
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    try {
      const response = await fetch("/api/admin/toggle-user-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      const payload = await readJsonResponse(response)

      if (!response.ok || !payload?.ok) {
        window.alert(payload && !payload.ok ? payload.error : "Não foi possível alterar o status do usuário agora.")
        return
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error("Admin toggle status request failed", error)
      window.alert("Não foi possível alterar o status do usuário agora.")
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
          <BrandCard className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4 text-[#004aad]" />
              Total de usuários
            </div>
            <div className="mt-3 text-4xl font-semibold text-foreground">{adminUsers.length}</div>
          </BrandCard>
          <BrandCard className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="size-4 text-[#004aad]" />
              Total de buscas geradas
            </div>
            <div className="mt-3 text-4xl font-semibold text-foreground">{searches.length}</div>
          </BrandCard>
          <BrandCard className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4 text-[#004aad]" />
              Créditos consumidos
            </div>
            <div className="mt-3 text-4xl font-semibold text-foreground">{consumedCredits}</div>
          </BrandCard>
          <BrandCard className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4 text-[#004aad]" />
              Pagamentos realizados
            </div>
            <div className="mt-3 text-4xl font-semibold text-foreground">{finance.paymentsCount}</div>
          </BrandCard>
          <BrandCard className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4 text-[#004aad]" />
              Créditos vendidos
            </div>
            <div className="mt-3 text-4xl font-semibold text-foreground">{finance.soldCredits}</div>
          </BrandCard>
          <BrandCard className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-[#004aad]" />
              Receita estimada
            </div>
            <div className="mt-3 text-4xl font-semibold text-foreground">{estimatedRevenue}</div>
          </BrandCard>
        </div>

        <BrandCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Usuários</h2>
          </div>
          <div className="space-y-3">
            {adminUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border/60 px-4 py-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1.4fr_0.7fr_0.7fr_0.8fr_0.7fr_1.2fr] lg:items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">{user.email}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{user.role}</div>
                  <div className="text-sm text-muted-foreground">{user.credits} créditos</div>
                  <div className="text-sm text-muted-foreground">{user.totalSearches} buscas</div>
                  <div className="text-sm text-muted-foreground">{formatShortDate(user.joinedAt)}</div>
                  <div className="text-sm font-medium text-foreground">{user.statusLabel}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="rounded-full border border-border/60 bg-white/80 px-3 py-2 text-xs font-medium text-foreground transition hover:border-[#5de0e6]/60"
                    >
                      Ver usuário
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(user)}
                      disabled={isPending}
                      className="rounded-full border border-border/60 bg-white/80 px-3 py-2 text-xs font-medium text-foreground transition hover:border-[#5de0e6]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {user.statusLabel === "ativo" ? "Bloquear" : "Desbloquear"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAddCredits(user)}
                      disabled={isPending}
                      className="rounded-full border border-border/60 bg-white/80 px-3 py-2 text-xs font-medium text-foreground transition hover:border-[#5de0e6]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Adicionar créditos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BrandCard>

        <BrandCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Buscas recentes</h2>
          </div>
          <div className="space-y-3">
            {searches.map((search) => {
              const relatedUser = adminUsers.find((user) => user.id === search.userId)
              return (
                <div key={search.id} className="rounded-2xl border border-border/60 px-4 py-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr_1fr_0.8fr_0.7fr_0.6fr] lg:items-center">
                    <div className="text-sm font-medium text-foreground">{relatedUser?.email ?? search.userId}</div>
                    <div className="text-sm text-muted-foreground">{resolveSearchOrigin(search.origin)}</div>
                    <div className="text-sm text-muted-foreground">{search.destination}</div>
                    <div className="text-sm text-muted-foreground">{search.estimatedCost}</div>
                    <div className="text-sm text-muted-foreground">{formatShortDate(search.createdAt)}</div>
                    <div className="text-sm text-muted-foreground">1 crédito</div>
                  </div>
                </div>
              )
            })}
          </div>
        </BrandCard>

        <BrandCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Créditos e pagamentos</h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <div className="mb-3 text-sm font-medium text-foreground">Pacotes disponíveis</div>
              <div className="space-y-3">
                {creditPackages.map((pack) => (
                  <div key={pack.id} className="rounded-2xl border border-border/60 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-foreground">{pack.credits} créditos</div>
                      <div className="text-base font-semibold text-foreground">{pack.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-medium text-foreground">Compras recentes</div>
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="rounded-2xl border border-border/60 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.6fr] sm:items-center">
                      <div className="text-sm font-medium text-foreground">{purchase.email ?? purchase.user}</div>
                      <div className="text-sm text-muted-foreground">{purchase.plan ?? "sem plano"}</div>
                      <div className="text-sm text-muted-foreground">{purchase.credits} créditos</div>
                      <div className="text-sm text-muted-foreground">{purchase.value}</div>
                      <div className="text-sm text-muted-foreground">{formatShortDate(purchase.date)}</div>
                      <div className="text-sm text-muted-foreground">{purchase.status}</div>
                    </div>
                  </div>
                ))}
                {!purchases.length ? (
                  <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                    Nenhuma compra real encontrada.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </BrandCard>

        <AdminSupportCard support={support} />
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => (open ? null : setSelectedUser(null))}>
        <DialogContent className="max-w-xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Ver usuário</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Estrutura pronta para conferência do perfil real no admin.
              </DialogDescription>
            </DialogHeader>

            {selectedUser ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{selectedUser.email}</div>
                  <div className="mt-1">{selectedUser.email}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                    Créditos disponíveis
                    <div className="mt-2 text-lg font-semibold text-foreground">{selectedUser.credits}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                    Total de buscas
                    <div className="mt-2 text-lg font-semibold text-foreground">{selectedUser.totalSearches}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                    Cadastro
                    <div className="mt-2 text-lg font-semibold text-foreground">{formatShortDate(selectedUser.joinedAt)}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">
                    Role
                    <div className="mt-2 text-lg font-semibold text-foreground">{selectedUser.role}</div>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Fechar
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
