import { Suspense } from "react"
import { LockKeyhole } from "lucide-react"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { AuthForm } from "@/components/auth/auth-form"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <SectionShell className="pt-12">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <PageIntro
            badge={
              <BrandBadge>
                <LockKeyhole className="size-4 text-[#5de0e6]" />
                Acesso
              </BrandBadge>
            }
            title="Entre para continuar sua descoberta."
            description="A tela de acesso segue a mesma leitura clara da landing: foco no próximo passo, poucos elementos e CTA direto."
          />
          <Suspense fallback={null}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
