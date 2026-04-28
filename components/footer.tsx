import Image from "next/image"

export function Footer() {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/images/vuei-logo.png"
              alt="vuei"
              width={80}
              height={32}
              className="h-6 w-auto opacity-70"
            />
            <span className="text-sm text-muted-foreground">(voei)</span>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} vuei. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
