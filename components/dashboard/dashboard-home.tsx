import Link from "next/link"
import { History, Sparkles, Wallet } from "lucide-react"
import { AiTripForm } from "@/components/trip/ai-trip-form"
import { BrandBadge } from "@/components/ui/brand-badge"
import { BrandCard } from "@/components/ui/brand-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { formatShortDate } from "@/lib/utils/format"
import type { Search } from "@/types/search"
import type { User } from "@/types/user"

export function DashboardHome({ user, searches }: { user: User; searches: Search[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div id="nova-busca">
          <BrandCard glow className="p-7 sm:p-8">
            <BrandBadge className="mb-5">
              <Sparkles className="size-4 text-[#5de0e6]" />
              Olá, {user.name}
            </BrandBadge>
            <h2 className="font-heading text-3xl font-bold text-foreground">Seu painel de descobertas</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Refaça buscas, acompanhe o histórico e continue explorando sem sair do mesmo universo visual da landing.
            </p>
            <div className="mt-8">
              <AiTripForm placeholder="Ex: Quero uma viagem barata para descansar em agosto" redirectTo="/dashboard/resultado" />
            </div>
          </BrandCard>
        </div>

        <div id="minhas-viagens">
          <BrandCard className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <History className="size-5 text-[#004aad]" />
              <h3 className="text-lg font-semibold text-foreground">Minhas viagens</h3>
            </div>
            <div className="space-y-3">
              {searches.slice(0, 3).map((search) => (
                <Link
                  key={search.id}
                  href={`/dashboard/resultado?tripId=${encodeURIComponent(search.id)}`}
                  className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-4 transition hover:border-[#5de0e6]/60"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{search.destination}</div>
                    <div className="text-sm text-muted-foreground">{search.input}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">{search.estimatedCost}</div>
                    <div className="text-xs text-muted-foreground">{formatShortDate(search.createdAt)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </BrandCard>
        </div>
      </div>

      <div className="space-y-6">
        <BrandCard className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4 text-[#004aad]" />
            Créditos
          </div>
          <div className="mt-3 text-2xl font-semibold text-foreground">Créditos disponíveis: {user.credits}</div>
        </BrandCard>

        <BrandCard glow className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-5 text-[#004aad]" />
            <h3 className="text-lg font-semibold text-foreground">Não sabe para onde ir?</h3>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Responda algumas perguntas e o VUEI sugere uma viagem ideal para você.
          </p>
          <GradientButton href="/dashboard/quiz" size="lg" className="mt-5 w-full">
            Começar quiz
          </GradientButton>
        </BrandCard>
      </div>
    </div>
  )
}
