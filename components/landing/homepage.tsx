import { BenefitsSection } from "@/components/landing/benefits-section"
import { FinalCtaSection } from "@/components/landing/final-cta-section"
import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { QuizTeaserSection } from "@/components/landing/quiz-teaser-section"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"

export function HomePage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <HeroSection />
      <QuizTeaserSection />
      <HowItWorksSection />
      <BenefitsSection />
      <FinalCtaSection />
      <SiteFooter />
    </main>
  )
}
