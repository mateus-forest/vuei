import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ensureAdminUserOnce } from "@/lib/setup/create-admin"
import "./globals.css"

export const metadata: Metadata = {
  title: "VUEI - Descubra sua próxima viagem em segundos",
  description: "Simule destinos, custos e roteiros com inteligência artificial. Planeje viagens com rapidez e clareza.",
  generator: "OpenAI Codex",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await ensureAdminUserOnce()

  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" ? <Analytics /> : null}
      </body>
    </html>
  )
}
