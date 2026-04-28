import Image from "next/image"
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
        <div className="flex items-center gap-3">
          <Image src="/images/vuei-logo.png" alt="VUEI" width={144} height={54} className="h-11 w-auto opacity-90" />
          <span className="text-sm text-muted-foreground">Descubra, simule e planeje em segundos.</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/login" className="transition hover:text-foreground">
            Entrar
          </Link>
          <Link href="/dashboard" className="transition hover:text-foreground">
            Dashboard
          </Link>
          <span>© 2026 VUEI</span>
        </div>
      </div>
    </footer>
  )
}
