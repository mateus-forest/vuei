# Production Audit

Data da auditoria: 1 de maio de 2026

## Checklist verificado

- [x] Geração de viagem autenticada valida sessão no backend.
- [x] Consumo de crédito não depende do frontend.
- [x] Crédito só é debitado após geração concluída com sucesso.
- [x] Erro da IA não consome crédito.
- [x] Histórico autenticado exige sessão.
- [x] Dashboard e páginas autenticadas dependem de sessão no servidor.
- [x] Leitura de viagem por `tripId` não expõe buscas privadas de outros usuários.
- [x] Checkout Stripe usa variáveis de ambiente.
- [x] Checkout envia `metadata.user_id`.
- [x] Webhook valida assinatura com `STRIPE_WEBHOOK_SECRET`.
- [x] Webhook ignora pagamentos não confirmados.
- [x] Webhook tem proteção contra duplicidade por `eventId` e `paymentId`.
- [x] Build de produção concluído sem erro de TypeScript.

## O que foi corrigido

### 1. Créditos

- Reforcei o débito de crédito em `lib/services/trip-service.ts`.
- O fluxo agora:
  - gera a viagem primeiro;
  - recarrega o saldo real no backend;
  - faz débito atômico com `compare-and-set` em `profiles.credits`;
  - só registra consumo depois que o débito foi confirmado;
  - reverte o saldo se falhar ao registrar a transação;
  - reverte saldo e remove a transação de uso se falhar ao salvar a viagem.
- Isso reduz o risco de múltiplas viagens com 1 crédito em requisições concorrentes.

### 2. Rotas protegidas e isolamento

- `app/api/searches/route.ts` agora retorna `401` sem sessão autenticada.
- `lib/services/search-service.ts` passou a restringir `getTravelHistoryItem(...)` sem `userId` apenas para registros anônimos (`user_id is null`).
- Isso evita que um `tripId` público acesse viagens privadas salvas por outro usuário.

### 3. Stripe / webhook

- `app/api/stripe/checkout/route.ts` agora envia `metadata.user_id` além de `metadata.userId`.
- `app/api/stripe/webhook/route.ts` foi endurecido para:
  - validar pagamento como `paid`;
  - rejeitar metadata inválida de plano/créditos;
  - registrar `event.id` processado com marcador `stripe_event:<eventId>`;
  - evitar crédito duplicado por evento repetido e por `payment_id`.

### 4. Ambiente

- Adicionei `STRIPE_PRICE_ID` em `.env.example`, além das variáveis já usadas por pacote.

## Riscos encontrados

### Alto

- Nenhum alto risco aberto permaneceu no código revisado após as correções acima.

### Médio

- O script `npm run lint` existe, mas o projeto não possui `eslint` instalado/configurado no ambiente atual.
- `npm install` reportou `2 vulnerabilities` em dependências de terceiros (`1 moderate`, `1 high`), sem correção aplicada nesta auditoria.
- Buscas anônimas continuam acessíveis por `tripId` na rota pública de resultado. Isso não expõe dados privados autenticados, mas mantém o comportamento de compartilhamento por ID. Se isso não for desejado em produção, o ideal é trocar por token assinado/expiração.

## Configuração manual antes do deploy

### Vercel

- Configurar:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID`
  - `STRIPE_PRICE_ID_PACK_5`
  - `STRIPE_PRICE_ID_PACK_15`
  - `STRIPE_PRICE_ID_PACK_30`
  - `STRIPE_PAYMENT_LINK_PACK_5`
  - `STRIPE_PAYMENT_LINK_PACK_15`
  - `STRIPE_PAYMENT_LINK_PACK_30`
  - `NEXT_PUBLIC_APP_URL`

### Stripe

- Confirmar que o webhook de produção aponta para `/api/stripe/webhook`.
- Confirmar que o endpoint usa o segredo correto de produção.
- Validar que os `price_id`/links configurados correspondem aos pacotes reais.

### Supabase

- Confirmar políticas de acesso, schema e tabelas:
  - `profiles`
  - `payments`
  - `credit_transactions`
  - `searches`
- Validar se existe unicidade suficiente para `payments.stripe_session_id`.

## Recomendações finais

- Instalar e configurar `eslint` de forma oficial antes do go-live para que `npm run lint` vire uma validação real.
- Rodar teste manual completo em ambiente staging com Stripe real:
  1. login
  2. compra de créditos
  3. confirmação do webhook
  4. geração autenticada
  5. consumo de crédito
  6. bloqueio sem crédito
  7. histórico
  8. download
  9. logout/login
- Rodar `npm audit` e avaliar atualização segura das dependências vulneráveis.

## Evidências desta auditoria

- `npm install`: executado
- `npm run build`: concluído com sucesso
- `npm run lint`: falhou porque `eslint` não está instalado no projeto
