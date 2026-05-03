"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CreditCard, HelpCircle, History, Home, LogOut, Menu, Shield, User, X } from "lucide-react"
import { signOut } from "@/lib/services/session-service"
import { creditPackages } from "@/lib/constants/credit-packages"
import { formatShortDate } from "@/lib/utils/format"
import type { Search } from "@/types/search"
import type { User as DashboardUser } from "@/types/user"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function DashboardHeader({ user, searches = [] }: { user: DashboardUser; searches?: Search[] }) {
  const [isTripsOpen, setIsTripsOpen] = useState(false)
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedPackId, setSelectedPackId] = useState("")
  const [checkoutLoadingPackId, setCheckoutLoadingPackId] = useState("")
  const [creditsError, setCreditsError] = useState("")
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  async function handleLogout() {
    await signOut()
    window.location.href = "/"
  }

  function handleSaveProfile() {
    setIsEditProfileOpen(false)
  }

  function handleSavePassword() {
    setIsChangePasswordOpen(false)
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false)
  }

  async function handleCheckout(packId: string) {
    setSelectedPackId(packId)
    setCheckoutLoadingPackId(packId)
    setCreditsError("")

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: packId }),
      })

      const json = (await res.json().catch(() => null)) as
        | { ok: true; data: { url: string } }
        | { ok: false; error: string }
        | null

      if (!res.ok || !json?.ok) {
        setCreditsError((json && !json.ok && json.error) || "Não foi possível iniciar o checkout agora.")
        return
      }

      window.location.assign(json.data.url)
    } catch (error) {
      console.error("CHECKOUT ERROR", error)
      setCreditsError("Não foi possível iniciar o checkout agora.")
    } finally {
      setCheckoutLoadingPackId("")
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="relative flex items-center">
            <div className="absolute -inset-5 rounded-full bg-[linear-gradient(90deg,#5de0e62b,#004aad2b)] blur-2xl" />
            <Image
              src="/images/vuei-logo.png"
              alt="VUEI"
              width={248}
              height={96}
              className="relative h-20 w-auto drop-shadow-lg"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-foreground/80 transition hover:text-foreground">
              <Home className="size-4 text-[#004aad]" />
              Início
            </Link>
            <button
              type="button"
              onClick={() => setIsTripsOpen(true)}
              className="text-sm text-foreground/80 transition hover:text-foreground"
            >
              Minhas viagens
            </button>
            <button
              type="button"
              onClick={() => setIsCreditsOpen(true)}
              className="text-sm text-foreground/80 transition hover:text-foreground"
            >
              Créditos
            </button>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="text-sm text-foreground/80 transition hover:text-foreground"
            >
              Ajuda
            </button>
            <Link href="/dashboard#nova-busca" className="text-sm text-foreground/80 transition hover:text-foreground">
              Nova busca
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-white/80 p-2 text-foreground transition hover:border-[#5de0e6]/60 md:hidden"
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-border/60 bg-white/80 p-1 text-foreground transition hover:border-[#5de0e6]/60"
                >
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-[linear-gradient(135deg,#5de0e6,#004aad)] text-sm font-semibold text-white">
                      {user.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="text-sm font-semibold text-foreground">{profileForm.name}</div>
                  <div className="mt-1 text-xs font-normal text-muted-foreground">{profileForm.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl px-3 py-2" onSelect={() => setIsEditProfileOpen(true)}>
                  <User className="size-4 text-[#004aad]" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl px-3 py-2" onSelect={() => setIsChangePasswordOpen(true)}>
                  <Shield className="size-4 text-[#004aad]" />
                  Alterar senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl px-3 py-2" onSelect={() => void handleLogout()}>
                  <LogOut className="size-4 text-[#004aad]" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t border-border/50 bg-background/95 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm text-foreground transition hover:border-[#5de0e6]/60"
              >
                Início
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu()
                  setIsTripsOpen(true)
                }}
                className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-left text-sm text-foreground transition hover:border-[#5de0e6]/60"
              >
                Minhas viagens
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu()
                  setIsCreditsOpen(true)
                }}
                className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-left text-sm text-foreground transition hover:border-[#5de0e6]/60"
              >
                Créditos
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu()
                  setIsHelpOpen(true)
                }}
                className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-left text-sm text-foreground transition hover:border-[#5de0e6]/60"
              >
                Ajuda
              </button>
              <Link
                href="/dashboard#nova-busca"
                onClick={closeMobileMenu}
                className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm text-foreground transition hover:border-[#5de0e6]/60"
              >
                Nova busca
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <Dialog open={isTripsOpen} onOpenChange={setIsTripsOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="flex min-h-0 flex-1 flex-col p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading text-2xl text-foreground">
                <History className="size-5 text-[#004aad]" />
                Minhas viagens
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Veja seu histórico de buscas e viagens simuladas no VUEI.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                {searches.map((search) => (
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreditsOpen} onOpenChange={setIsCreditsOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading text-2xl text-foreground">
                <CreditCard className="size-5 text-[#004aad]" />
                Créditos
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Consulte seus créditos disponíveis e os pacotes do dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/35 px-4 py-4">
              <div className="text-sm text-muted-foreground">Créditos disponíveis</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{user.credits}</div>
            </div>

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Cada viagem gerada consome 1 crédito. O roteiro completo e o download em PDF não consomem créditos.
            </p>

            <div className="mt-5 space-y-3">
              {creditPackages.map((pack) => (
                <div key={pack.id} className="rounded-2xl border border-border/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-foreground">{pack.credits} créditos</div>
                    <div className="flex items-center gap-3">
                      <div className="text-base font-semibold text-foreground">{pack.price}</div>
                      <button
                        type="button"
                        onClick={() => void handleCheckout(pack.id)}
                        className="rounded-full border border-border/60 bg-white/80 px-3 py-2 text-xs font-medium text-foreground transition hover:border-[#5de0e6]/60"
                        disabled={checkoutLoadingPackId === pack.id}
                      >
                        {checkoutLoadingPackId === pack.id ? "Carregando..." : selectedPackId === pack.id ? "Selecionado" : "Quero esse"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {creditsError ? <p className="mt-4 text-sm text-[#004aad]">{creditsError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading text-2xl text-foreground">
                <HelpCircle className="size-5 text-[#004aad]" />
                Central de ajuda VUEI
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Encontre respostas rápidas sobre o uso do VUEI e acesso ao suporte.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 rounded-2xl border border-border/60 bg-white/80 px-5 py-3">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="help-1">
                  <AccordionTrigger className="text-foreground hover:no-underline">Como funciona o VUEI?</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    O VUEI usa inteligência artificial para sugerir destinos, estimar custos e montar roteiros em poucos segundos.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-2">
                  <AccordionTrigger className="text-foreground hover:no-underline">Como os créditos são consumidos?</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    Cada viagem gerada consome 1 crédito. O roteiro completo e o download em PDF não consomem créditos.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-3">
                  <AccordionTrigger className="text-foreground hover:no-underline">Posso usar o quiz?</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    Sim. O quiz ajuda quem ainda não sabe para onde viajar. Ao finalizar, o VUEI sugere uma viagem com base nas suas respostas.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-4">
                  <AccordionTrigger className="text-foreground hover:no-underline">O custo da viagem é preço real?</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    Não. Nesta versão, os valores são estimativas para ajudar na decisão inicial.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-5">
                  <AccordionTrigger className="text-foreground hover:no-underline">Posso baixar meu roteiro?</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    Sim. Após gerar uma viagem, você pode baixar o roteiro em PDF.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-6">
                  <AccordionTrigger className="text-foreground hover:no-underline">Como compro mais créditos?</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    Clique em Créditos no dashboard e escolha o pacote desejado.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/35 px-5 py-5">
              <div className="text-lg font-semibold text-foreground">Precisa de ajuda?</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Fale com o suporte VUEI pelo WhatsApp.</p>
              <div className="mt-2 text-sm font-medium text-foreground">(54) 99990-2688</div>
              <DialogFooter className="mt-5">
                <Link
                  href="https://wa.me/5554999902688"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
                >
                  Chamar suporte
                </Link>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Editar perfil</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Atualize seus dados de forma local no dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Nome</span>
                <input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Email</span>
                <input
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Salvar
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="max-w-md rounded-[28px] border-border/60 bg-background p-0 shadow-2xl">
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">Alterar senha</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Atualize sua senha de forma mockada dentro do dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Senha atual</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Nova senha</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Confirmar nova senha</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 text-sm outline-none transition focus:border-[#5de0e6]/70"
                />
              </label>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-sm font-medium text-foreground transition hover:border-[#5de0e6]/60"
              >
                Salvar
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
