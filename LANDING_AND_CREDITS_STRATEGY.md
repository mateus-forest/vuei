# Estratégia de landing, geração modular e créditos do VUEI

Este documento propõe a nova experiência da landing e da geração de viagens do VUEI sem alterar código nesta etapa.

## 1. Objetivo da mudança

O VUEI hoje gera tudo em uma única chamada:

- destino
- preço
- inteligência
- variantes
- roteiro completo

Isso cria três problemas principais:

1. payload grande demais para a IA
2. instabilidade no JSON da resposta
3. pouca escalada comercial, porque o usuário recebe o valor máximo logo na primeira interação

A proposta é transformar o produto em uma jornada modular:

- primeiro o usuário descobre a viagem
- depois aprofunda orçamento
- depois libera roteiro completo
- depois faz ajustes sob demanda

Essa estrutura melhora:

- estabilidade técnica
- percepção de valor
- previsibilidade do custo de IA
- clareza de cobrança por crédito

---

## 2. Fluxo da landing

### 2.1 Estrutura principal

A landing deve continuar com um campo principal de entrada, simples e comercial:

- input aberto para o desejo de viagem
- CTA principal: `Descobrir viagem`
- perfil opcional pode continuar existindo como refinador

O papel da landing deve ser:

- capturar intenção
- gerar a descoberta inicial
- mostrar valor rápido
- empurrar o usuário para login, créditos e módulos pagos sem sobrecarregar na primeira chamada

### 2.2 Comportamento para usuário não logado

#### Recomendação principal

- usuário não logado pode usar `1 descoberta`
- essa descoberta consome o crédito grátis inicial apenas se ele já tiver conta
- se ainda não tiver conta, há duas opções estratégicas possíveis:

Opção recomendada:

- permitir uma prévia pública sem salvar como crédito real
- ao tentar aprofundar, exigir cadastro

Motivo:

- reduz fricção na aquisição
- aumenta taxa de ativação
- evita “gastar” o melhor momento do produto antes do usuário entender o valor

Fluxo sugerido:

1. usuário digita a viagem
2. clica em `Descobrir viagem`
3. vê um resultado inicial enxuto
4. ao clicar em módulo avançado:
   - `Criar conta para continuar`
   - ou `Entrar para usar créditos`

### 2.3 Comportamento para usuário logado

- usuário logado usa seus créditos normalmente
- a descoberta já salva a base da viagem
- a tela de resultado mostra claramente o que já foi gerado e o que ainda pode ser desbloqueado

### 2.4 O que acontece ao clicar em `Descobrir viagem`

Fluxo ideal:

1. o VUEI interpreta o pedido
2. roda apenas o módulo de descoberta
3. salva um `tripId` base
4. retorna uma página de resultado inicial curta e comparável

Essa primeira entrega não deve incluir:

- breakdown detalhado completo
- roteiro dia a dia completo
- texto excessivo

### 2.5 O que o resultado inicial deve exibir

Após a descoberta, o usuário deve ver:

- destino sugerido
- período sugerido ou informado
- duração
- número de pessoas
- variantes de preço:
  - Econômico
  - Intermediário
  - Premium
- scores simplificados
- explicação curta de por que a viagem faz sentido
- resumo curto do roteiro

Resumo curto do roteiro significa:

- 3 a 5 bullets
- sem detalhar manhã/tarde/noite
- sem itinerary completo

Exemplo do bloco inicial:

- Destino: Bariloche
- Período sugerido: Julho de 2026
- Duração: 5 dias
- Faixa estimada:
  - Econômico
  - Intermediário
  - Premium
- Compatibilidade: Alta
- Custo: Razoável
- Clima: Bom
- Resumo da experiência:
  - centro histórico
  - neve e mirantes
  - gastronomia local
  - passeio panorâmico principal

---

## 3. Definição dos módulos

## Módulo 1 — Descoberta

### Consumo

- `1 crédito`

### Entrega

- destino recomendado
- período sugerido
- duração
- quantidade de viajantes
- custo estimado em 3 níveis
- explicação de aderência
- scores simplificados
- resumo curto do roteiro

### Objetivo de produto

- vender a ideia da viagem
- responder “faz sentido?”
- dar visão rápida de custo
- preparar upsell para orçamento e roteiro

### Requisito técnico

- payload pequeno
- sem breakdown completo
- sem dia a dia completo

## Módulo 2 — Orçamento detalhado

### Consumo

- `1 crédito`

### Entrega

- breakdown:
  - passagens
  - hospedagem
  - alimentação
  - transporte
  - atividades
- impacto do período no custo
- alertas de custo
- sugestões para economizar
- premissas do cálculo

### Objetivo de produto

- responder “quanto custa de verdade?”
- aumentar confiança
- transformar curiosidade em intenção de compra

### Dependência

- exige que o módulo de descoberta já exista
- usa a base já salva pelo `tripId`

## Módulo 3 — Roteiro completo

### Consumo

- `1 crédito`

### Entrega

- roteiro dia a dia
- manhã / tarde / noite
- dicas práticas
- experiências locais
- gastronomia
- observações operacionais

### Objetivo de produto

- responder “como eu faria essa viagem?”
- entregar o maior valor percebido
- estimular download e retenção

### Dependência

- usa destino, período, variante e perfil já definidos

## Módulo 4 — Ajustar viagem

### Consumo

- `1 crédito` apenas quando a mudança alterar significativamente a saída

### Mudanças que devem cobrar

- mudar destino
- mudar duração
- mudar orçamento
- mudar perfil
- mudar período

### Mudanças que não devem cobrar

- trocar entre Econômico / Intermediário / Premium se já estiverem gerados na descoberta
- abrir novamente um orçamento já gerado
- abrir novamente um roteiro já gerado
- baixar um resultado já existente

### Objetivo de produto

- permitir exploração sem destruir a confiança do usuário
- monetizar iterações reais

---

## 4. UX da tela de resultado

## 4.1 Estado após a descoberta

A página de resultado deve virar uma tela-base da viagem, com três camadas:

1. resumo da viagem
2. comparação de preço
3. ações de aprofundamento

### Bloco principal

- destino
- período
- duração
- pessoas
- variante selecionada
- custo principal
- explicação curta

### Bloco comparativo

- Econômico
- Intermediário
- Premium

Sem breakdown completo nessa fase.

### Bloco de ações

Botões visíveis:

- `Ver orçamento detalhado (1 crédito)`
- `Gerar roteiro completo (1 crédito)`
- `Comparar com outro destino (1 crédito)`

Botões secundários possíveis:

- `Ajustar viagem`
- `Entrar para salvar`
- `Baixar roteiro` apenas se o módulo de roteiro já existir

## 4.2 Regras de comportamento

- não recarregar tudo do zero
- usar a base já gerada
- não cobrar novamente por abrir algo já gerado
- exibir selo de status por módulo

### Exemplo de status

- Descoberta: gerada
- Orçamento detalhado: não gerado
- Roteiro completo: não gerado

Depois do unlock:

- Descoberta: gerada
- Orçamento detalhado: gerado
- Roteiro completo: gerado

## 4.3 Estado de histórico

No histórico, cada viagem deve abrir exatamente no último estado salvo.

Exemplo:

- viagem A tem só descoberta
- viagem B tem descoberta + orçamento
- viagem C tem descoberta + orçamento + roteiro

Abrir histórico nunca consome crédito.

---

## 5. Lógica de créditos

## 5.1 Regras principais

- usuário novo recebe `1 crédito grátis`
- descoberta consome `1 crédito`
- orçamento detalhado consome `1 crédito`
- roteiro completo consome `1 crédito`
- ajuste significativo consome `1 crédito`

## 5.2 O que não consome crédito

- abrir histórico
- reabrir um resultado já salvo
- trocar aba entre módulos já gerados
- download
- ver variantes já calculadas dentro da descoberta

## 5.3 O que consome crédito novamente

- regenerar descoberta com novo input
- comparar com outro destino
- alterar período de forma relevante
- alterar perfil/orçamento/duração e pedir novo cálculo
- gerar orçamento detalhado de uma nova base
- gerar roteiro completo de uma nova base

## 5.4 Regra de anti-duplicidade

Para evitar cobrança duplicada:

- cada módulo precisa ter status persistido por `tripId`
- a cobrança só acontece quando:
  - o módulo ainda não existe
  - ou a entrada relevante mudou

### Chave conceitual

Cobrança deve depender de:

- `tripId`
- `moduleType`
- `inputHash` do módulo

Exemplo:

- descoberta da viagem `X`: cobrada 1 vez
- abrir novamente a descoberta da viagem `X`: não cobra
- orçamento detalhado da viagem `X` com mesma variante e mesmo período: não cobra
- orçamento detalhado da viagem `X` após alterar período: cobra novo módulo

## 5.5 Regra de UX de saldo

Sempre mostrar antes do clique:

- custo da ação em crédito
- saldo atual
- o que será liberado

Exemplo:

`Gerar roteiro completo (1 crédito)`

Texto auxiliar:

`Saldo atual: 2 créditos`

---

## 6. Arquitetura técnica sugerida

Sem implementar agora.

## 6.1 Rotas sugeridas

### Descoberta

- `POST /api/ai/discover`

Responsabilidade:

- interpretar pedido
- sugerir destino
- montar período
- montar variantes resumidas
- salvar base inicial

### Orçamento detalhado

- `POST /api/ai/budget`

Responsabilidade:

- receber `tripId`
- expandir breakdown
- salvar módulo de orçamento

### Roteiro completo

- `POST /api/ai/itinerary`

Responsabilidade:

- receber `tripId`
- gerar dia a dia
- salvar módulo de roteiro

### Ajustes

- `POST /api/ai/adjust`

Responsabilidade:

- receber `tripId`
- aplicar alterações estruturais
- decidir se gera nova base ou novo submódulo

## 6.2 Modelo conceitual de persistência

### Registro base

Tabela ou estrutura principal:

- `trip_sessions` ou reaproveitamento evoluído de `searches`

Campos conceituais:

- `id`
- `user_id`
- `origin`
- `input_original`
- `normalized_request`
- `destination_base`
- `period_base`
- `travelers`
- `selected_variant`
- `discovery_result`
- `created_at`
- `updated_at`

### Módulos

Tabela conceitual:

- `trip_modules`

Campos:

- `id`
- `trip_id`
- `module_type`
  - `discovery`
  - `budget`
  - `itinerary`
  - `adjustment`
- `input_hash`
- `result_payload`
- `credits_used`
- `created_at`

### Crédito por módulo

Cada consumo precisa apontar para:

- `trip_id`
- `module_type`
- `module_record_id`

Assim fica possível:

- auditar cobrança
- evitar duplicidade
- explicar consumo ao usuário

## 6.3 Relação por `tripId`

O `tripId` deve ser a âncora da jornada inteira.

Tudo parte dele:

- descoberta
- orçamento
- roteiro
- ajustes
- downloads
- histórico

---

## 7. Riscos

## 7.1 Riscos de UX

### Alta criticidade

- o usuário pode sentir que “recebeu menos” na primeira tela se a descoberta ficar pobre demais

Mitigação:

- a descoberta precisa continuar impressionando
- mostrar:
  - destino
  - período
  - variantes
  - explicação forte
  - resumo enxuto do roteiro

### Média criticidade

- a cobrança por etapa pode parecer “muitos cliques para chegar ao mesmo lugar”

Mitigação:

- deixar claro o que cada módulo entrega
- mostrar custo antes do clique
- evitar pedir crédito para pequenas ações de navegação

## 7.2 Risco de consumo excessivo de créditos

### Alta criticidade

- usuário pode gastar sem entender que está gerando algo novo

Mitigação:

- botão sempre com preço
- confirmação leve quando o saldo estiver baixo
- log de consumo visível no histórico da conta

## 7.3 Risco de abandono

### Média criticidade

- se a descoberta for fraca ou muito limitada, o usuário abandona antes de ver valor

Mitigação:

- a descoberta precisa ser boa o bastante para convencer
- mas curta o suficiente para não quebrar a IA

## 7.4 Risco técnico de estado inconsistente

### Alta criticidade

- módulos gerados em ordens diferentes
- cobrança feita sem persistência
- persistência feita sem cobrança
- alteração mudando base mas mantendo módulo velho

Mitigação:

- cada módulo com status explícito
- cada cobrança vinculada a um módulo persistido
- invalidação clara de módulos derivados quando a base muda

Exemplo:

- mudou período
- orçamento anterior e roteiro anterior devem virar “desatualizados”

## 7.5 Impacto na IA

### Positivo

- payload menor
- menos risco de JSON quebrado
- melhor observabilidade por etapa
- prompts mais especializados

### Negativo

- maior complexidade de orquestração
- necessidade de manter coerência entre módulos

---

## 8. Ordem ideal de implementação

## Etapa 1 — Reduzir payload atual

Objetivo:

- estabilizar a geração
- encurtar a descoberta

Entregas:

- limitar o resultado inicial
- remover o roteiro completo da primeira chamada

## Etapa 2 — Separar descoberta

Objetivo:

- consolidar o módulo base
- tornar a landing clara

Entregas:

- `discover`
- persistência da base
- tela de resultado inicial

## Etapa 3 — Separar orçamento detalhado

Objetivo:

- aprofundar custo sem depender do roteiro

Entregas:

- endpoint próprio
- persistência do módulo
- lógica de crédito por módulo

## Etapa 4 — Separar roteiro completo

Objetivo:

- tirar o bloco mais pesado da chamada inicial

Entregas:

- endpoint próprio
- payload dedicado
- persistência do roteiro

## Etapa 5 — Ajustar lógica de créditos

Objetivo:

- cobrar por valor entregue
- evitar duplicidade

Entregas:

- status por módulo
- vínculo entre cobrança e módulo
- regras de não recobrança

## Etapa 6 — Ajustar UI

Objetivo:

- refletir claramente a nova lógica

Entregas:

- CTAs por módulo
- estados gerado / não gerado / desatualizado
- histórico modular

---

## 9. Proposta final recomendada

### Melhor formato para o VUEI

#### Landing

- continua simples
- foco em `Descobrir viagem`
- descoberta inicial rápida e comercial

#### Resultado inicial

- suficiente para encantar
- insuficiente para substituir o produto completo

#### Crédito

- consumo por etapa
- claro
- previsível
- auditável

#### Arquitetura

- `tripId` como eixo central
- módulos persistidos separadamente
- invalidação controlada quando a base muda

### Estratégia recomendada em uma frase

O VUEI deve deixar de ser uma geração monolítica “tudo de uma vez” e passar a operar como uma jornada modular: primeiro descobrir, depois provar o custo, depois entregar o roteiro, cobrando crédito apenas quando uma nova camada real de valor for gerada.
