import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration"
import { ensureAdminUserOnce } from "@/lib/setup/create-admin"
import "./globals.css"

export const metadata: Metadata = {
  title: "VUEI - Descubra sua próxima viagem em segundos",
  description: "Simule destinos, custos e roteiros com inteligência artificial. Planeje viagens com rapidez e clareza.",
  generator: "OpenAI Codex",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VUEI",
  },
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#004aad",
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
        <ServiceWorkerRegistration />
        {process.env.NODE_ENV === "production" ? <Analytics /> : null}
      </body>
    </html>
  )
}
