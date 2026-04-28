"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, LayoutDashboard } from "lucide-react"
import { signOut } from "@/lib/services/session-service"
import { Button } from "@/components/ui/button"

export function AdminHeader() {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="relative flex items-center">
            <div className="absolute -inset-4 rounded-full bg-[linear-gradient(90deg,#5de0e628,#004aad24)] blur-2xl" />
            <Image
              src="/images/vuei-logo.png"
              alt="VUEI"
              width={188}
              height={72}
              className="relative h-14 w-auto drop-shadow-lg"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="rounded-full border-border/60 bg-white/80">
              <Link href="/dashboard">
                <LayoutDashboard className="size-4 text-[#004aad]" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" className="rounded-full text-foreground/80 hover:text-foreground" onClick={() => void handleLogout()}>
              <>
                <ArrowLeft className="size-4 text-[#004aad]" />
                Sair
              </>
            </Button>
          </div>
        </div>

        <div>
          <h1 className="font-heading text-4xl font-bold text-foreground">Admin VUEI</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Painel interno de acompanhamento</p>
        </div>
      </div>
    </header>
  )
}
