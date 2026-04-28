import { Compass } from "lucide-react"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { ResultView } from "@/components/trip/result-view"
import { BrandBadge } from "@/components/ui/brand-badge"
import { PageIntro } from "@/components/ui/page-intro"
import { SectionShell } from "@/components/ui/section-shell"
import { getTravelHistoryItem } from "@/lib/services/search-service"
import { generateTrip, generateTripWithAI } from "@/lib/services/trip-service"
import type { QuizAnswer } from "@/types/trip"

function parseQuizAnswers(params: Record<string, string | string[] | undefined>): QuizAnswer | null {
  const keys: Array<keyof QuizAnswer> = ["tripStyle", "budget", "duration", "region", "vibe"]
  if (!keys.every((key) => typeof params[key] === "string")) return null

  return {
    tripStyle: params.tripStyle as QuizAnswer["tripStyle"],
    budget: params.budget as QuizAnswer["budget"],
    duration: params.duration as QuizAnswer["duration"],
    region: params.region as QuizAnswer["region"],
    vibe: params.vibe as QuizAnswer["vibe"],
  }
}

export default async function PublicResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const tripId = typeof params.tripId === "string" ? params.tripId : ""
  const suggestion = typeof params.suggestion === "string" ? params.suggestion : ""
  const input = typeof params.input === "string" ? params.input : "quero viajar para europa com 5 mil reais"
  const quizAnswers = parseQuizAnswers(params)
  const historyItem = tripId ? await getTravelHistoryItem(tripId) : null
  const sourceParam = typeof params.source === "string" ? params.source : quizAnswers ? "quiz" : historyItem?.origin ?? "busca"
  const source = sourceParam === "quiz" ? "quiz" : sourceParam === "sugestao" ? "suggestion" : "text"

  const fallbackGeneration = generateTrip({
    origin: sourceParam === "quiz" ? "quiz" : sourceParam === "sugestao" ? "sugestao" : "busca",
    inputText: historyItem?.input ?? input,
    quizAnswers: quizAnswers ?? undefined,
  })

  let aiResult = null

  if (!historyItem) {
    try {
      aiResult = await generateTripWithAI({
        origin: sourceParam === "quiz" ? "quiz" : sourceParam === "sugestao" ? "sugestao" : "busca",
        inputText: input,
        quizAnswers: quizAnswers ?? undefined,
      })
    } catch (error) {
      console.error("OpenAI trip generation failed on public result page", error)
    }
  }

  const result = historyItem?.result ?? aiResult ?? fallbackGeneration.result
  const description =
    source === "quiz"
      ? "Baseado nas suas respostas do quiz"
      : source === "suggestion" && suggestion
        ? `Baseado na sugestão escolhida: ${suggestion}`
        : `Baseado na sua busca: ${historyItem?.input ?? input}`

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <SectionShell className="overflow-hidden pt-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-24 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[#5de0e6]/12 blur-3xl" />
        </div>
        <div className="relative space-y-10">
          <PageIntro
            badge={
              <BrandBadge>
                <Compass className="size-4 text-[#5de0e6]" />
                Resultado da simulação
              </BrandBadge>
            }
            title="Veja a viagem sugerida e decida com mais clareza."
            description={description}
          />
          <ResultView result={result} input={historyItem?.input ?? input} loggedIn={false} source={source} suggestion={suggestion} />
        </div>
      </SectionShell>
      <SiteFooter />
    </main>
  )
}
