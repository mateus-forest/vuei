"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Compass, Heart, Users, Briefcase, Mountain, Sparkles } from "lucide-react"

const tripTypes = [
  { id: "romantic", label: "Romântica", icon: Heart },
  { id: "family", label: "Família", icon: Users },
  { id: "adventure", label: "Aventura", icon: Mountain },
  { id: "business", label: "Negócios", icon: Briefcase },
]

const budgetOptions = [
  { value: "1000", label: "Até R$ 1.000" },
  { value: "3000", label: "R$ 1.000 - R$ 3.000" },
  { value: "5000", label: "R$ 3.000 - R$ 5.000" },
  { value: "10000", label: "R$ 5.000 - R$ 10.000" },
  { value: "unlimited", label: "Acima de R$ 10.000" },
]

const durationOptions = [
  { value: "weekend", label: "Final de semana" },
  { value: "week", label: "1 semana" },
  { value: "twoweeks", label: "2 semanas" },
  { value: "month", label: "1 mês ou mais" },
]

export function QuickDiscovery() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [budget, setBudget] = useState<string>("")
  const [duration, setDuration] = useState<string>("")

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent" />
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-full text-sm text-muted-foreground mb-6">
            <Compass className="w-4 h-4 text-[#5de0e6]" />
            Descoberta rápida
          </div>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Não sabe por onde começar?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Responda rápido e descubra destinos ideais
          </p>
        </div>

        {/* Form Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#5de0e6]/20 to-[#004aad]/20 rounded-3xl blur-xl" />
          <div className="relative bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-xl">
            <div className="space-y-8">
              {/* Trip Type - Buttons */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-4">
                  Tipo de viagem
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tripTypes.map((type) => {
                    const Icon = type.icon
                    const isSelected = selectedType === type.id
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#5de0e6] bg-gradient-to-br from-[#5de0e6]/10 to-[#004aad]/10 shadow-lg"
                            : "border-border/50 bg-secondary/30 hover:border-[#5de0e6]/50 hover:bg-secondary/50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected 
                            ? "bg-gradient-to-r from-[#5de0e6] to-[#004aad]" 
                            : "bg-muted"
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                          {type.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selects Row */}
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Budget Select */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Orçamento
                  </label>
                  <Select value={budget} onValueChange={setBudget}>
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-border/50 text-foreground">
                      <SelectValue placeholder="Selecione seu orçamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration Select */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Duração
                  </label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-border/50 text-foreground">
                      <SelectValue placeholder="Quanto tempo?" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-[#5de0e6] to-[#004aad] text-white text-lg py-6 h-auto rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#004aad]/20 hover:shadow-xl hover:shadow-[#004aad]/30 hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Descobrir destino
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
