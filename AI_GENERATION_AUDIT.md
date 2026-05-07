# Auditoria da geração de viagens com IA

Este relatório foi gerado por inspeção do código atual, sem aplicar correções adicionais no sistema.

## 1. Fluxo da geração

### Entrada da requisição

1. O frontend envia a requisição para `POST /api/ai/generate-trip`.
   - Arquivos principais:
     - `components/trip/ai-trip-form.tsx`
     - `components/quiz/quiz-form.tsx`
     - `app/api/ai/generate-trip/route.ts`

2. A rota valida o payload com Zod:
   - `app/api/ai/generate-trip/route.ts:53`
   - schema: `generateTripPayloadSchema`

3. A rota chama:
   - `generateTripWithAI(...)` para usuários não autenticados
   - `generateAndPersistTrip(...)` para usuários autenticados
   - ambos vivem em `lib/services/trip-service.ts`

### Requisição para a OpenAI

4. A chamada da OpenAI é feita em:
   - `lib/services/trip-service.ts:1246`
   - função: `generateTripWithAI(request)`

5. O client é criado em:
   - `lib/openai/server.ts`

6. A chamada atual usa:
   - `client.responses.create(...)`
   - linha principal: `lib/services/trip-service.ts:1260`

### Recebimento da resposta

7. A resposta bruta é lida de:
   - `response.output_text`
   - fallback: `JSON.stringify(response.output_parsed)`
   - `lib/services/trip-service.ts:1316-1319`

8. O serviço registra log da resposta bruta:
   - `console.info("OpenAI raw response", ...)`
   - `lib/services/trip-service.ts:1322`

### Parse do JSON

9. O parse principal acontece em:
   - `parseAITripPayload(rawResponse)`
   - `lib/services/trip-service.ts:131-167`

10. O fluxo de parse é:
   - tenta `JSON.parse(rawResponse)` em `lib/services/trip-service.ts:136`
   - se falhar, tenta extrair um bloco JSON com regex em `extractJsonFromAIResponse(...)`
   - tenta novo `JSON.parse(extractedJson)` em `lib/services/trip-service.ts:147`

### Validação do schema

11. Depois do parse, a estrutura é validada com:
   - `aiTripSchema.safeParse(parsed)`
   - `lib/services/trip-service.ts:161`

12. Se passar, o payload é mapeado para `TripResult` em:
   - `mapStructuredOutputToTripResult(...)`
   - `lib/services/trip-service.ts`

### Onde o erro é lançado

13. Erros específicos de parse são lançados em:
   - `createAIParseError(...)`
   - `lib/services/trip-service.ts:103-109`

14. Os códigos atuais são:
   - `AI_JSON_INVALID`
   - `AI_JSON_NOT_FOUND`
   - `AI_SCHEMA_INVALID`

15. O erro sobe para:
   - `generateAndPersistTrip(...)` em `lib/services/trip-service.ts:1385-1391`
   - ou para a rota pública em `app/api/ai/generate-trip/route.ts:117-131`

16. A transformação em mensagem amigável para o fluxo autenticado acontece em:
   - `resolveAIError(...)`
   - `lib/services/trip-service.ts:1181-1209`

## 2. Pontos frágeis

### Alta criticidade

#### A. O sistema ainda depende de `JSON.parse` manual

- Local:
  - `lib/services/trip-service.ts:136`
  - `lib/services/trip-service.ts:147`
- Risco:
  - qualquer resposta truncada, com string aberta ou escape malformado quebra com `SyntaxError: Unterminated string in JSON`
- Observação:
  - há `try/catch`, então a aplicação já não quebra silenciosamente, mas o ponto frágil continua sendo a qualidade do texto retornado pela IA

#### B. O prompt pede muito conteúdo estruturado e textual

- Local:
  - `lib/services/trip-service.ts:1270-1288`
- Risco:
  - o prompt exige:
    - `summary`
    - `tips`
    - 3 variants
    - breakdown por variant
    - `detailedItinerary` por variant
    - `morning`, `afternoon`, `evening`, `tips` por dia
  - isso gera payloads grandes e mais suscetíveis a truncamento ou string mal fechada

#### C. O conteúdo mais arriscado está em `detailedItinerary`

- Local:
  - `aiItineraryDaySchema` em `lib/services/trip-service.ts:31-37`
- Risco:
  - `morning`, `afternoon`, `evening` e `tips` são campos de texto livre
  - eles concentram:
    - frases longas
    - aspas eventuais
    - nomes próprios
    - descrições narrativas
  - isso aumenta a chance de JSON quebrado no meio de uma string

### Média criticidade

#### D. A extração de JSON por regex é um fallback frágil

- Local:
  - `extractJsonFromAIResponse(...)`
  - `lib/services/trip-service.ts:111-129`
- Risco:
  - regex `\{[\s\S]*\}` pega do primeiro `{` ao último `}`
  - se houver ruído textual com chaves ou fragmentos incompletos, pode extrair algo inválido
- Observação:
  - é um fallback útil, mas não é um parser estrutural robusto

#### E. A rota pública ainda reduz os erros a 429/503

- Local:
  - `app/api/ai/generate-trip/route.ts:117-131`
- Risco:
  - o fluxo público não distingue explicitamente erro de parse 502
  - o detalhe técnico vai em `detail`, mas a resposta principal continua genérica
- Impacto:
  - dificulta diagnóstico operacional mais fino

#### F. Há vários `JSON.parse` em componentes de frontend

- Locais:
  - `components/trip/ai-trip-form.tsx:94`
  - `components/quiz/quiz-form.tsx:70`
  - `components/admin/admin-panel.tsx:42`
- Observação:
  - esses parses não são da OpenAI; são do corpo HTTP retornado pela API
  - o risco aqui é menor, mas existe dependência de resposta JSON válida do backend

### Baixa criticidade

#### G. `zodTextFormat(...)` continua presente, mas não está fazendo o parse final

- Local:
  - `lib/services/trip-service.ts:1311`
- Observação:
  - ele ajuda a orientar o formato pedido ao modelo
  - mas a segurança real hoje depende do parse manual posterior

## 3. Análise do prompt

### O que o prompt faz bem

- Pede JSON estruturado
- Pede explicitamente:
  - “Retorne APENAS JSON válido”
  - “Não inclua texto antes ou depois”
  - “Não use comentários”
  - “Garanta que todas as strings estejam corretamente fechadas”
- Restringe o tamanho narrativo:
  - “Mantenha o JSON compacto”
  - “Resuma summary, assumptions e tips”
  - “Cada campo morning, afternoon e evening deve ter no máximo duas frases curtas”

### Riscos ainda presentes no prompt

#### Alta criticidade

- O prompt continua muito denso para um único retorno.
- Ele mistura:
  - custo
  - breakdown
  - narrativa
  - personalização
  - 3 variantes
  - roteiro dia a dia
- Mesmo pedindo JSON puro, o volume estrutural ainda é alto.

#### Média criticidade

- O prompt não proíbe explicitamente aspas dentro dos textos descritivos.
- Campos como:
  - `summary`
  - `assumptions`
  - `morning`
  - `afternoon`
  - `evening`
  - `tips`
  continuam sendo fontes prováveis de string malformada.

#### Baixa criticidade

- Não há mistura explícita de “explicação + JSON” no prompt atual.
- Isso reduz um erro clássico, mas não elimina truncamento ou string aberta.

## 4. Análise da resposta e observabilidade

### Logs existentes

#### Positivo

- Há log da resposta bruta:
  - `console.info("OpenAI raw response", ...)`
  - `lib/services/trip-service.ts:1322`

- Há log do erro de parse:
  - `console.error("Erro ao parsear IA:", rawResponse)`
  - `lib/services/trip-service.ts:138`

- Há log do erro de chamada/parse consolidado:
  - `console.error("OpenAI parse/call failed", ...)`
  - `lib/services/trip-service.ts:1335`

- Há medição de tempo:
  - `console.time("openai-call")`
  - `console.timeEnd("openai-call")`
  - `lib/services/trip-service.ts:1256` e `1342`

### Possibilidade de truncamento

#### Alta criticidade

- Existe sim possibilidade real de truncamento.
- Sinais no código:
  - `max_output_tokens: 1100`
  - 3 variants
  - cada variant com `detailedItinerary`
  - até 10 dias por variant
  - 3 blocos textuais por dia
- Mesmo com limites por campo, a soma total ainda pode ficar grande dependendo do destino e do estilo da resposta.

### Campos mais propensos a quebrar

#### Alta criticidade

- `variants[].detailedItinerary[].morning`
- `variants[].detailedItinerary[].afternoon`
- `variants[].detailedItinerary[].evening`
- `variants[].detailedItinerary[].tips[]`
- `variants[].assumptions`
- `summary`

Motivos:

- texto livre
- chance de aspas
- descrição longa
- maior volume acumulado

## 5. Possíveis causas do erro `Unterminated string in JSON`

### Alta criticidade

1. Resposta truncada da OpenAI antes do fechamento completo do objeto JSON.
2. Campo textual longo demais dentro de `detailedItinerary`.
3. String gerada com aspas internas ou escape inconsistente.
4. Excesso de conteúdo por exigir 3 variantes completas com roteiro detalhado.

### Média criticidade

5. Regex de extração capturando um bloco incompleto ou poluído.
6. Resposta híbrida rara com ruído adicional fora do JSON esperado.

### Baixa criticidade

7. Problema no transporte HTTP é menos provável, porque o erro relatado é de string não terminada dentro do JSON, o que aponta mais para payload textual do modelo.

## 6. Locais com `JSON.parse` usados diretamente

### Relevante para a IA

- `lib/services/trip-service.ts:136`
- `lib/services/trip-service.ts:147`

### Não diretamente ligado ao erro da OpenAI, mas presentes no sistema

- `components/trip/ai-trip-form.tsx:94`
- `components/quiz/quiz-form.tsx:70`
- `components/admin/admin-panel.tsx:42`

## 7. Ausência de proteção / fallback

### Situação atual

- `try/catch` existe no parse da IA
- fallback de extração de JSON existe
- validação de schema existe
- mensagem amigável existe no fluxo autenticado

### Fragilidade remanescente

- o sistema não quebra de forma bruta, mas ainda depende de um retorno textual muito exigente
- o principal gargalo não é mais ausência de `try/catch`; é complexidade do payload pedido ao modelo

## 8. Diagnóstico resumido

### Causa mais provável

Criticidade: Alta

O erro recorrente de `SyntaxError: Unterminated string in JSON` tende a ser causado por combinação de:

- resposta longa demais
- JSON com muitos campos textuais livres
- truncamento ou fechamento incorreto de string durante a geração do modelo

### Ponto mais sensível do fluxo

Criticidade: Alta

`generateTripWithAI(...)` em `lib/services/trip-service.ts`, especialmente no trecho:

- `client.responses.create(...)`
- leitura de `response.output_text`
- `parseAITripPayload(...)`

## 9. Recomendações técnicas para próxima etapa

Sem aplicar agora.

### Alta prioridade

1. Reduzir ainda mais o volume do JSON pedido por chamada.
2. Diminuir o peso de `detailedItinerary`, principalmente por variant.
3. Considerar limitar dias por variant no retorno da IA e completar o restante por fallback local.
4. Diferenciar explicitamente o erro 502 também na rota pública `app/api/ai/generate-trip/route.ts`.

### Média prioridade

5. Trocar a extração por regex por um mecanismo mais robusto de recuperação de JSON.
6. Logar separadamente:
   - tamanho da resposta
   - tamanho do `output_text`
   - presença de `output_parsed`
7. Registrar amostras dos casos quebrados para identificar quais campos mais falham.

### Baixa prioridade

8. Revisar `JSON.parse` dos componentes frontend que leem respostas da API, para padronizar tratamento de corpo inválido.
