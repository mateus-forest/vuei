import { Suspense } from "react"
import { UserPlus2 } from "lucide-react"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { AuthForm } from "@/components/auth/auth-form"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"

export default function SignupPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <SectionShell className="pt-12">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <PageIntro
            badge={
              <BrandBadge>
                <UserPlus2 className="size-4 text-[#5de0e6]" />
                Cadastro
              </BrandBadge>
            }
            title="Crie sua conta e transforme a busca em histórico."
            description="Uma extensão natural da home para quem quer continuar ajustando viagens, salvar resultados e usar créditos."
          />
          <Suspense fallback={null}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
