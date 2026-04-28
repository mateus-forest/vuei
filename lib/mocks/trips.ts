import type { QuizAnswer, TripResult } from "@/types/trip"

export const defaultTripResult: TripResult = {
  destination: "Portugal",
  estimatedCost: "R$ 5.200",
  bestFor: "casal, cultura, gastronomia",
  summary: "Uma viagem equilibrada entre custo e experiência, com boa comida, deslocamentos simples e dias leves.",
  itinerary: [
    "Dia 1: chegada e centro histórico",
    "Dia 2: passeio cultural",
    "Dia 3: bate-volta",
    "Dia 4: gastronomia local",
  ],
  fullItinerary: [
    "Dia 1: chegada, check-in, caminhada inicial pelo centro histórico e ajuste do restante da programação.",
    "Dia 2: visitas culturais principais com pausa para café, almoço e deslocamentos curtos entre os pontos centrais.",
    "Dia 3: bate-volta para uma cidade próxima, com retorno no fim do dia e noite livre para descanso.",
    "Dia 4: roteiro focado em gastronomia local, compras finais e organização do retorno.",
  ],
  tips: [
    "Viajar fora da alta temporada reduz os custos",
    "Hospedagens centrais economizam tempo",
    "Reservar com antecedência melhora o preço",
  ],
  context: "Ideal para quem quer decidir rápido sem abrir mão de uma experiência completa.",
  cheapestAlternative: "Porto",
}

export const tripCatalog: Array<{ match: string[]; result: TripResult }> = [
  {
    match: ["nordeste", "praia", "maceio", "maragogi", "brasil"],
    result: {
      destination: "Alagoas",
      estimatedCost: "R$ 3.400",
      bestFor: "praia, casal, descanso",
      summary: "Uma viagem enxuta, visualmente forte e com boa relação entre conforto e custo.",
      itinerary: [
        "Dia 1: chegada em Maceió e orla de Pajuçara",
        "Dia 2: passeio em Maragogi",
        "Dia 3: São Miguel dos Milagres",
        "Dia 4: beach clubs e retorno",
      ],
      fullItinerary: [
        "Dia 1: chegada em Maceió, check-in e passeio leve pela orla de Pajuçara.",
        "Dia 2: saída cedo para Maragogi, com foco nas piscinas naturais e retorno no fim da tarde.",
        "Dia 3: bate-volta para São Miguel dos Milagres com ritmo leve e boa janela para descanso.",
        "Dia 4: manhã em beach club, almoço com vista para o mar e retorno.",
      ],
      tips: [
        "Evite feriados prolongados para pagar menos",
        "Transfer compartilhado reduz custo total",
        "Passeios com antecedência costumam sair mais baratos",
      ],
      context: "Funciona muito bem para quem quer mar bonito e logística simples.",
      cheapestAlternative: "João Pessoa",
    },
  },
  {
    match: ["europa", "portugal", "cultura", "gastronomia"],
    result: defaultTripResult,
  },
  {
    match: ["frio", "inverno", "natureza", "avent", "patagonia", "bariloche"],
    result: {
      destination: "Bariloche",
      estimatedCost: "R$ 6.700",
      bestFor: "frio, natureza, aventura",
      summary: "Um roteiro para quem quer visual de montanha, experiências ao ar livre e boa estrutura.",
      itinerary: [
        "Dia 1: chegada e circuito central",
        "Dia 2: Cerro Catedral",
        "Dia 3: circuito chico",
        "Dia 4: navegação e chocolate",
      ],
      fullItinerary: [
        "Dia 1: chegada, check-in e passeio pelo centro para adaptação ao clima.",
        "Dia 2: dia dedicado ao Cerro Catedral com pausas para refeições e deslocamentos curtos.",
        "Dia 3: circuito chico com mirantes, paisagens e agenda mais contemplativa.",
        "Dia 4: navegação leve, parada para chocolate e retorno.",
      ],
      tips: [
        "Roupas técnicas alugadas ajudam a controlar o orçamento",
        "Voos com conexão costumam ter melhor tarifa",
        "Monte dias livres para clima variável",
      ],
      context: "Melhor para quem aceita um ticket um pouco maior em troca de experiência marcante.",
      cheapestAlternative: "Santiago com Valle Nevado",
    },
  },
]

export const quizResultMap: Record<QuizAnswer["vibe"], TripResult> = {
  praia: {
    destination: "Porto de Galinhas",
    estimatedCost: "R$ 3.100",
    bestFor: "praia, casal, descanso",
    summary: "Boa opção para relaxar rápido com visual forte e gasto previsível.",
    itinerary: [
      "Dia 1: chegada e praia central",
      "Dia 2: piscinas naturais",
      "Dia 3: passeio em Carneiros",
      "Dia 4: dia livre e retorno",
    ],
    fullItinerary: [
      "Dia 1: chegada, check-in e caminhada pela praia central para reconhecimento da área.",
      "Dia 2: saída para as piscinas naturais com agenda leve e retorno para descanso.",
      "Dia 3: passeio em Carneiros com foco em paisagem e logística simples.",
      "Dia 4: manhã livre, café com calma e retorno.",
    ],
    tips: [
      "Hospedagem próxima ao centro evita gastos extras",
      "Passeios de manhã costumam ser melhores para fotos",
      "Evite datas de alta lotação para manter custo baixo",
    ],
    context: "Perfeito para quem quer decidir rápido e descansar sem complicação.",
    cheapestAlternative: "Maceió",
  },
  inverno: {
    destination: "Campos do Jordão",
    estimatedCost: "R$ 2.700",
    bestFor: "frio, gastronomia, final de semana",
    summary: "Uma viagem curta com clima de serra, boa gastronomia e ritmo leve.",
    itinerary: [
      "Dia 1: Vila Capivari",
      "Dia 2: teleférico e cafés",
      "Dia 3: parques e retorno",
      "Dia 4: extensão opcional para vinícolas",
    ],
    fullItinerary: [
      "Dia 1: chegada, check-in e passeio pela Vila Capivari com jantar local.",
      "Dia 2: teleférico, cafés e paradas curtas para aproveitar o clima.",
      "Dia 3: agenda em parques com ritmo leve e retorno.",
      "Dia 4: extensão opcional para vinícolas e compras.",
    ],
    tips: [
      "Dias de semana ajudam a economizar",
      "Reservas em hotéis menores costumam ter melhor preço",
      "Monte o roteiro a pé na área central",
    ],
    context: "Boa escolha para quem quer sensação de viagem premium com baixa complexidade.",
    cheapestAlternative: "Monte Verde",
  },
  verao: {
    destination: "Porto Seguro",
    estimatedCost: "R$ 3.300",
    bestFor: "verão, praia, descanso",
    summary: "Uma viagem leve para dias de calor, praia e agenda simples de encaixar.",
    itinerary: [
      "Dia 1: chegada e orla",
      "Dia 2: praias principais",
      "Dia 3: passeio complementar",
      "Dia 4: dia livre e retorno",
    ],
    fullItinerary: [
      "Dia 1: chegada, check-in e passeio leve pela orla.",
      "Dia 2: visita às praias principais com deslocamentos curtos.",
      "Dia 3: encaixe de um passeio complementar com ritmo flexível.",
      "Dia 4: café da manhã tranquilo, último mergulho e retorno.",
    ],
    tips: [
      "Reservas antecipadas ajudam a manter o custo previsível",
      "Passeios pela manhã costumam render melhor aproveitamento",
      "Hospedagem central reduz deslocamentos",
    ],
    context: "Boa para quem quer uma leitura clara de viagem de verão sem aumentar a complexidade.",
    cheapestAlternative: "Arraial d'Ajuda",
  },
  cultura: defaultTripResult,
  natureza: {
    destination: "Chapada dos Veadeiros",
    estimatedCost: "R$ 3.600",
    bestFor: "natureza, aventura, grupos",
    summary: "Uma rota com cachoeiras, boa energia e custo controlável para vários perfis.",
    itinerary: [
      "Dia 1: Alto Paraíso",
      "Dia 2: cachoeiras principais",
      "Dia 3: trilhas leves",
      "Dia 4: vila de São Jorge",
    ],
    fullItinerary: [
      "Dia 1: chegada em Alto Paraíso, check-in e agenda leve de adaptação.",
      "Dia 2: foco nas cachoeiras principais com deslocamento planejado.",
      "Dia 3: trilhas leves e tempo para descanso.",
      "Dia 4: manhã na vila de São Jorge e retorno.",
    ],
    tips: [
      "Alugar carro melhora a experiência",
      "Hospedagens simples atendem bem",
      "Leve dias com folga para deslocamentos",
    ],
    context: "Boa para quem quer natureza forte sem abrir mão de conforto mínimo.",
    cheapestAlternative: "Capitólio",
  },
  luxo: {
    destination: "Punta del Este",
    estimatedCost: "R$ 8.900",
    bestFor: "luxo, casal, gastronomia",
    summary: "Uma sugestão premium para quem quer viagem curta com sensação de exclusividade.",
    itinerary: [
      "Dia 1: check-in e marina",
      "Dia 2: beach clubs e gastronomia",
      "Dia 3: vinícolas e compras",
      "Dia 4: brunch e retorno",
    ],
    fullItinerary: [
      "Dia 1: chegada, check-in e passeio pela marina no fim da tarde.",
      "Dia 2: beach clubs e experiências gastronômicas com agenda confortável.",
      "Dia 3: visitas a vinícolas e tempo para compras.",
      "Dia 4: brunch, fechamento da viagem e retorno.",
    ],
    tips: [
      "Viajar fora do pico deixa a experiência mais fluida",
      "Reserve restaurantes antes da viagem",
      "Pacotes aéreos com hotel podem melhorar custo final",
    ],
    context: "Ideal para quem busca impacto rápido e experiência premium.",
    cheapestAlternative: "Buenos Aires premium",
  },
}
