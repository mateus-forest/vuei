"use client"

import { useState } from "react"
import { Compass, Sparkles } from "lucide-react"
import { QuizForm } from "@/components/quiz/quiz-form"
import { AiTripForm } from "@/components/trip/ai-trip-form"
import { BrandBadge } from "@/components/ui/brand-badge"
import { BrandCard } from "@/components/ui/brand-card"
import { SectionShell } from "@/components/ui/section-shell"

type EntryMode = "search" | "quiz"

const entryOptions: Array<{
  id: EntryMode
  title: string
  description: string
}> = [
  {
    id: "search",
    title: "Buscador rápido",
    description: "Descreva sua viagem em uma frase e receba uma recomendação inteligente.",
  },
  {
    id: "quiz",
    title: "Quiz guiado",
    description: "Responda algumas perguntas e deixe o VUEI sugerir a melhor viagem para você.",
  },
]

export function PlanningEntrySection() {
  const [activeEntry, setActiveEntry] = useState<EntryMode>("search")

  return (
    <SectionShell id="planejar" className="overflow-hidden pt-10 sm:pt-12">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/35 to-transparent" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <BrandBadge className="mb-5">
            <Compass className="size-4 text-[#5de0e6]" />
            Escolha sua entrada
          </BrandBadge>
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Como você quer planejar sua viagem?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Escolha um caminho para começar. Depois do login, o VUEI continua a geração com os dados que você já preencheu.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {entryOptions.map((option) => {
            const isActive = activeEntry === option.id

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveEntry(option.id)}
                className="text-left"
                aria-pressed={isActive}
              >
                <BrandCard
                  glow={isActive}
                  className={[
                    "h-full p-5 transition sm:p-6",
                    isActive ? "border-[#5de0e6]/70 bg-white" : "border-border/60 bg-white/85 hover:border-[#5de0e6]/45",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{option.title}</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                    </div>
                    <div
                      className={[
                        "mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl border transition",
                        isActive
                          ? "border-transparent bg-[linear-gradient(135deg,#5de0e6,#004aad)] text-white"
                          : "border-border/60 bg-secondary/25 text-muted-foreground",
                      ].join(" ")}
                    >
                      <Sparkles className="size-5" />
                    </div>
                  </div>
                </BrandCard>
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          <div className={activeEntry === "search" ? "block" : "hidden"} aria-hidden={activeEntry !== "search"}>
            <AiTripForm requireAuthBeforeSubmit />
          </div>
          <div className={activeEntry === "quiz" ? "block" : "hidden"} aria-hidden={activeEntry !== "quiz"}>
            <QuizForm requireAuthBeforeSubmit />
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
