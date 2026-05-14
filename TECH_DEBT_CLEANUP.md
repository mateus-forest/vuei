# Tech Debt Cleanup

## Escopo

- Revisao conservadora de mocks, imports legados e codigo morto.
- Sem alterar fluxos de creditos, Stripe, webhook ou fallback local da IA.

## Mocks encontrados

- `lib/mocks/users.ts`
  - Usado apenas por `lib/services/user-service.ts` em um `listUsers()` legado.
- `lib/mocks/travel-history.ts`
  - Nao possuia imports ativos no app.
- `lib/mocks/trips.ts`
  - Ainda usado por `lib/services/trip-service.ts`.
  - Base do fallback local da geracao de viagens.

## Removidos

- `lib/mocks/users.ts`
  - Removido por nao ter mais uso ativo no fluxo real.
- `lib/mocks/travel-history.ts`
  - Removido por estar totalmente orfao.
- `listUsers()` em `lib/services/user-service.ts`
  - Removido por retornar apenas mock e nao possuir chamadas no projeto.
- `listSearches()` e `listTravelHistory()` em `lib/services/search-service.ts`
  - Removidos por nao terem uso ativo e por duplicarem acesso a `searches`.
- Import legado de `mockUsers` em `lib/services/user-service.ts`
  - Removido.
- Comentario TODO preso ao fallback mock em `lib/services/user-service.ts`
  - Removido junto com o caminho legado.

## Mantidos e por que

- `lib/mocks/trips.ts`
  - Mantido porque alimenta o fallback local da IA.
  - Esse caminho continua necessario para resiliencia quando a OpenAI falha.
- `getCurrentUser()` e `getUserById()` em `lib/services/user-service.ts`
  - Mantidos porque usam `profiles` reais e sustentam dashboard/admin/autenticacao.
- `listUserTravelHistory()` e `getTravelHistoryItem()` em `lib/services/search-service.ts`
  - Mantidos porque leem `searches` reais usados nas telas principais.

## Dados reais confirmados nas telas principais

- Admin financeiro:
  - `lib/services/admin-service.ts` usa `payments`, `credit_transactions`, `profiles`, `searches` e `support_tickets`.
- Historico de creditos:
  - `lib/services/credit-transaction-service.ts` usa `credit_transactions`.
- Pagamentos:
  - Fluxos e metricas usam `payments`.
- Usuarios:
  - Fluxos autenticados e admin usam `profiles` e `auth`.
- Viagens:
  - Dashboard e resultado usam `searches`.
- Chamados:
  - Usuario e admin usam `support_tickets`.

## Arquivos alterados

- `lib/services/user-service.ts`
- `lib/services/search-service.ts`
- `lib/mocks/users.ts`
- `lib/mocks/travel-history.ts`

## Riscos restantes

- `lib/mocks/trips.ts` segue no repositorio por dependencia real do fallback local.
- Ainda existem textos antigos no projeto com termos como "simulacao/simuladas", mas nesta limpeza eles nao representam dependencia de mock em producao.
- Nao foi possivel validar visualmente todas as telas a partir deste ambiente; a confirmacao final depende do app rodando no navegador.
