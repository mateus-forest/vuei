# Plano de limpeza de dados do VUEI

## Objetivo

Limpar dados de teste e usuários comuns sem tocar em administradores, Stripe, webhook, estrutura do banco ou regras principais do sistema.

## Critério de preservação de admins

- O projeto identifica administradores por `profiles.role = 'admin'`.
- Esse critério foi validado no banco antes de qualquer remoção.
- Nenhum registro com `role = 'admin'` foi apagado.

## Tabelas identificadas

- `profiles`
- `searches`
- `credit_transactions`
- `payments`
- `auth.users` via Supabase Auth Admin API

Observação:
- Não foi encontrada uma tabela separada de `trips` no fluxo atual. O histórico persistido de viagens está concentrado em `searches`.
- O schema ativo não possui a coluna `profiles.status`, embora alguns trechos de código tratem essa coluna como opcional.

## Leitura de segurança antes da limpeza

Inspeção feita com Supabase Admin API usando as credenciais locais do projeto.

Estado antes da limpeza:

- `profiles`: 3 registros
- `profiles` admin: 2
- `profiles` não-admin: 1
- `auth.users`: 5 registros
- `auth.users` mapeados para admins: 2
- `auth.users` não-admin: 3
- `searches` relacionados ao perfil comum identificado: 10
- `credit_transactions` relacionados ao perfil comum identificado: 14
- `payments` relacionados ao perfil comum identificado: 2

Admins preservados:

- `admin@vuei.com`
- `mateus_forest@hotmail.com`

## Backup lógico executado

Antes de qualquer delete, foi gerado backup local com os registros do perfil comum e seus relacionamentos:

- `maintenance/backups/database-cleanup-backup-2026-05-05.json`

Conteúdo incluído no backup:

- perfil não-admin identificado
- `searches` relacionados
- `credit_transactions` relacionados
- `payments` relacionados
- usuário de auth correspondente ao perfil removido
- usuários de auth sem profile correspondente, preservados para revisão manual

## Limpeza executada

A limpeza automática foi limitada apenas a registros com papel claramente identificado como não-admin.

Registros removidos:

- `profiles`: 1
- `searches`: 10
- `credit_transactions`: 14
- `payments`: 2
- `auth.users`: 1 usuário com profile não-admin correspondente

Perfil/common user removido:

- `088b53d6-c2d2-42ea-ad35-ead9a9c0d25f`
- e-mail: `mateus-maraschin@hotmail.com`

## Estado após a limpeza

- `profiles`: 2 registros
- admins restantes em `profiles`: 2
- não-admins restantes em `profiles`: 0
- `auth.users`: 4 registros
- `payments`: 0

Registros ainda existentes após a limpeza:

- `searches`: 10
- `credit_transactions`: 1

Interpretação:
- os registros restantes não pertencem ao perfil comum removido
- podem ser anônimos, de admin, ou de outra origem não enquadrada como exclusão automática segura

## Supabase Auth: revisão manual necessária

Foram identificados 2 usuários em `auth.users` sem profile correspondente e sem marcação explícita de admin:

- `6a501732-622f-4074-9618-250a74da6e6d` — `juliastconsultoria@outlook.com`
- `a4c1484a-8d80-4ea9-8195-661d51e10868` — `ju_soldatelli@hotmail.com`

Esses usuários não foram apagados automaticamente por segurança, porque:

- não possuem `profile` para confirmar `role`
- a regra desta tarefa exige não apagar automaticamente quando não houver identificação clara de admin

Recomendação manual:

1. Confirmar no Supabase Dashboard se esses dois usuários são de teste.
2. Se forem realmente usuários comuns/teste, apagá-los manualmente em:
   - `Supabase Dashboard > Authentication > Users`
3. Se desejar automatizar no futuro, primeiro criar um critério confiável de classificação para usuários de auth sem profile.

## Ajuste do bônus inicial de cadastro

Alteração aplicada:

- antes: `3` créditos
- agora: `1` crédito

Arquivos ajustados:

- `lib/services/credit-service.ts`
- `lib/services/user-service.ts` já consome a constante centralizada
- `app/api/auth/bootstrap-profile/route.ts` já consome a mesma constante
- `lib/mocks/users.ts` alinhado para usuário comum de exemplo

## Confirmação de e-mail de cadastro

O fluxo de cadastro foi preservado como estava:

- não foi criado bypass
- o sign-up continua dependendo da configuração do Supabase para confirmação de e-mail
- a aplicação continua usando o fluxo normal de `signUp` do Supabase

Observação:
- não houve teste manual de inbox/confirm-link nesta máquina
- a validação feita aqui foi estrutural, baseada no código e na configuração atual do fluxo

## Comandos executados

Leitura de contagem e identificação:

- consulta de `profiles`
- consulta de `searches`
- consulta de `credit_transactions`
- consulta de `payments`
- listagem de `auth.users`

Backup lógico:

- export local para `maintenance/backups/database-cleanup-backup-2026-05-05.json`

Limpeza automática:

- delete em `searches` por `user_id` do profile não-admin
- delete em `credit_transactions` por `user_id` do profile não-admin
- delete em `payments` por `user_id` do profile não-admin
- delete em `profiles` por `id` do profile não-admin, com proteção adicional `role != 'admin'`
- delete do usuário correspondente em `auth.users`

## Observação de segurança

- A limpeza automática só foi aplicada depois de:
  - identificar admins por `profiles.role = 'admin'`
  - levantar contagem prévia dos registros afetados
  - gerar backup lógico local
- Usuários de auth sem profile e sem papel verificável foram preservados por segurança.
