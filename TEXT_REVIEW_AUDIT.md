# Auditoria de Textos da Interface VUEI

Este relatório foi gerado por revisão manual dos componentes e páginas do projeto, sem aplicar correções no código.

## Observações gerais

- O problema mais recorrente hoje é de encoding/mojibake: vários textos aparecem como `Ã`, `??` ou versões quebradas de acentos.
- Há também inconsistências menores de tom e clareza, principalmente em placeholders, CTAs e mensagens de autenticação.
- Valores internos como `economico`, `intermediario`, `tripId`, `user_id` e chaves de schema não foram tratados como erro quando usados apenas em código.
- Em alguns pontos, o texto visível já está correto em partes do fluxo, mas há duplicidade entre versões corretas e versões quebradas no mesmo arquivo.

## Achados

| Arquivo/componente | Texto atual com problema | Problema identificado | Sugestão de texto corrigido | Prioridade |
| --- | --- | --- | --- | --- |
| `components/trip/result-view.tsx` | `Econ??mico`, `Intermedi??rio` | Encoding quebrado no comparativo principal de preço | `Econômico`, `Intermediário` | Alta |
| `components/trip/result-view.tsx` | `Vers??o mais enxuta da viagem...`, `Vers??o equilibrada...` | Texto visível do resultado com caracteres corrompidos | `Versão mais enxuta da viagem...`, `Versão equilibrada da viagem...` | Alta |
| `components/trip/result-view.tsx` | `Hospedagens econ??micas em ??reas...` | Texto de insights com encoding quebrado e perda de profissionalismo | `Hospedagens econômicas em áreas bem conectadas ajudam a controlar o orçamento.` | Alta |
| `components/trip/result-view.tsx` | `PerÃ­odo nÃ£o informado` | Fallback de período aparece quebrado em tela crítica | `Período não informado` | Alta |
| `components/trip/result-view.tsx` | `RazoÃ¡vel`, `EconÃ´mico`, `DesfavorÃ¡vel`, `ConfortÃ¡vel` | Labels dos scores aparecem quebradas | `Razoável`, `Econômico`, `Desfavorável`, `Confortável` | Alta |
| `components/trip/result-view.tsx` | `AÃ§Ãµes de exploraÃ§Ã£o`, `OpÃ§Ã£o mais barata`, `Ver opÃ§Ã£o mais barata` | Botões e títulos centrais do resultado com acentuação corrompida | `Ações de exploração`, `Opção mais barata`, `Ver opção mais barata` | Alta |
| `components/trip/result-view.tsx` | `Como usuÃ¡rio logado, vocÃª pode salvar...` | Texto comercial do bloco de continuidade está quebrado | `Como usuário logado, você pode salvar esta busca...` | Alta |
| `components/trip/result-view.tsx` | `Continue depois da busca grÃ¡tis` | Texto promocional em bloco de conversão com encoding ruim | `Continue depois da busca grátis` | Alta |
| `components/trip/result-view.tsx` | `FaÃ§a login`, `direÃ§Ã£o`, `rÃ¡pida`, `econÃ´mica`, `viÃ¡vel` | Várias mensagens de apoio no resultado estão corrompidas | Corrigir cada ocorrência para português com acento correto | Alta |
| `components/trip/result-view.tsx` | `Escolha uma alternativa mockada sem sair da tela de resultado.` | Termo `mockada` soa pouco profissional para usuário final | `Escolha uma alternativa simulada sem sair da tela de resultado.` | Média |
| `components/trip/result-view.tsx` | `Ajustar viagem` modal com `Orcamento`, `PerÃ­odo/mÃªs`, `duracao`, `instalacao em area pratica` | Mistura de palavras sem acento e trechos truncados nos ajustes locais | `Orçamento`, `Período/mês`, `duração`, `instalação em área prática` | Alta |
| `components/trip/itinerary-pdf-template.tsx` | `PerÃ­odo recomendado`, `DuraÃ§Ã£o`, `OpÃ§Ã£o`, `Insights da opÃ§Ã£o escolhida`, `Pontos de atenÃ§Ã£o`, `ObservaÃ§Ãµes finais` | PDF do roteiro continua exibindo vários títulos quebrados | `Período recomendado`, `Duração`, `Opção`, `Insights da opção escolhida`, `Pontos de atenção`, `Observações finais` | Alta |
| `components/trip/itinerary-pdf-template.tsx` | `safePeriodReason = "PerÃ­odo ainda nÃ£o definido para a viagem."`, `safeDates = "NÃ£o informado"` | Fallbacks do download continuam com encoding ruim | `Período ainda não definido para a viagem.`, `Não informado` | Alta |
| `components/trip/itinerary-pdf-template.tsx` | `Este roteiro foi criado especialmente para vocÃª... experiÃªncia Ãºnica.` | Fechamento do PDF perde qualidade por caracteres corrompidos | `Este roteiro foi criado especialmente para você... experiência única.` | Alta |
| `components/auth/auth-form.tsx` | `placeholder="voce@email.com"` | Placeholder sem acento em fluxo de login/cadastro | `você@email.com` | Alta |
| `components/auth/auth-form.tsx` | `NÃ£o foi possÃ­vel...`, `histÃ³rico`, `crÃ©ditos`, `Ainda nÃ£o tem conta?`, `JÃ¡ tem conta?`, `instruÃ§Ãµes` | Mensagens, subtítulos e links de auth exibem encoding quebrado | Corrigir para as versões acentuadas corretas | Alta |
| `components/auth/auth-form.tsx` | `Conta criada. Confirme seu e-mail antes de entrar.` e `Criar conta e entrar` | O CTA sugere entrada imediata, mas o fluxo pode exigir confirmação por e-mail | `Criar conta` ou `Criar conta e continuar` | Média |
| `lib/services/session-service.ts` | `Confirme seu email antes de entrar.` | Mensagem ao usuário sem acento em `e-mail` | `Confirme seu e-mail antes de entrar.` | Alta |
| `lib/services/session-service.ts` | `Email ou senha inválidos.` | Inconsistência de estilo: `Email` vs `E-mail` | `E-mail ou senha inválidos.` | Média |
| `components/landing/hero-section.tsx` | `simulaÃ§Ã£o`, `rÃ¡pido`, `vocÃª`, `simulaÃ§Ãµes` | Hero principal da landing com acentuação corrompida | Corrigir para `simulação`, `rápido`, `você`, `simulações` | Alta |
| `components/landing/site-header.tsx` | `Comecar`, `ComeÃ§ar` | CTA principal da landing aparece sem acento ou com encoding quebrado | `Começar` | Alta |
| `lib/constants/navigation.ts` | `BenefÃ­cios` | Item de menu da landing corrompido | `Benefícios` | Alta |
| `components/landing/benefits-section.tsx` | `SugestÃµes`, `antecedÃªncia`, `decisÃ£o`, `vocÃª` | Seção institucional com vários acentos quebrados | Corrigir todas as ocorrências | Alta |
| `components/landing/benefits-section.tsx` | `A home continua simples...` | Texto soa interno/produto, menos comercial | `Uma experiência simples, clara e pronta para evoluir com você.` | Média |
| `components/landing/how-it-works-section.tsx` | `vocÃª`, `simulaÃ§Ã£o`, `rÃ¡pido`, `fricÃ§Ã£o` | Seção explicativa com mojibake em pontos de alto tráfego | Corrigir para português acentuado correto | Alta |
| `components/landing/quiz-teaser-section.tsx` | `RomÃ¢ntica`, `FamÃ­lia`, `PrÃ¡tica`, `NÃ£o sabe por onde comeÃ§ar?`, `orÃ§amento`, `duraÃ§Ã£o` | Card do quiz na landing com vários problemas de acentuação | Corrigir todas as labels e textos | Alta |
| `components/landing/final-cta-section.tsx` | `prÃ³xima viagem`, `simulaÃ§Ã£o` | CTA final da landing com encoding quebrado | `próxima viagem`, `simulação` | Alta |
| `components/landing/site-footer.tsx` | `Â© 2026 VUEI` | Símbolo de copyright corrompido | `© 2026 VUEI` | Média |
| `components/dashboard/dashboard-home.tsx` | `OlÃ¡`, `RefaÃ§a`, `CrÃ©ditos`, `CrÃ©ditos disponÃ­veis`, `NÃ£o sabe para onde ir?`, `vocÃª`, `ComeÃ§ar quiz` | Dashboard principal com vários textos quebrados | Corrigir todos para acentuação adequada | Alta |
| `components/dashboard/dashboard-header.tsx` | `InÃ­cio`, `CrÃ©ditos`, `histÃ³rico`, `crÃ©ditos`, `rÃ¡pidas`, `inteligÃªncia`, `preÃ§o real`, `NÃ£o`, `ApÃ³s`, `usuÃ¡rio` | Header, ajuda, créditos e diálogos do dashboard têm muitas ocorrências quebradas | Corrigir todas as ocorrências visíveis | Alta |
| `components/dashboard/dashboard-header.tsx` | `Atualize seus dados de forma local no dashboard.` | Texto pouco profissional; transmite que a edição não é real | `Atualize seus dados no dashboard.` | Média |
| `components/dashboard/dashboard-header.tsx` | `Atualize sua senha de forma mockada dentro do dashboard.` | Termo `mockada` é inadequado para produção | `Atualize sua senha no dashboard.` ou esconder até o fluxo real existir | Média |
| `app/(public)/resultado/page.tsx` | `Baseado na sugestÃ£o escolhida` e badge `Resultado da simulaÃ§Ã£o` | Página pública de resultado com acentuação corrompida | `Baseado na sugestão escolhida`, `Resultado da simulação` | Alta |
| `app/(auth)/login/page.tsx` | `prÃ³ximo passo` | Descrição da tela de login com encoding quebrado | `próximo passo` | Média |
| `app/(auth)/cadastro/page.tsx` | `histÃ³rico`, `extensÃ£o` | Descrição da tela de cadastro com encoding quebrado | `histórico`, `extensão` | Média |
| `app/(authenticated)/dashboard/page.tsx` | `extensÃ£o`, `nÃ£o` | Intro do dashboard com acentuação quebrada | `extensão`, `não` | Média |
| `components/quiz/quiz-form.tsx` | `RomÃ¢ntica`, `FamÃ­lia`, `AtÃ©`, `VerÃ£o`, `NÃ£o foi possÃ­vel...`, `NÃºmero de adultos`, `NÃºmero de crianÃ§as`, `OrÃ§amento`, `DuraÃ§Ã£o`, `Ver sugestÃ£o agora` | Quiz tem vários labels e erros de acentuação em um fluxo central | Corrigir todas as ocorrências | Alta |
| `components/quiz/quiz-form.tsx` | `Destino` para opção `brasil/internacional` | Label pode gerar dúvida; trata região, não destino específico | `Região da viagem` | Média |
| `components/trip/ai-trip-form.tsx` | `FamÃ­lia`, `atraÃ§Ãµes`, `EconÃ´mico`, `IntermediÃ¡rio`, `Aceito conexÃµes`, `NÃ£o importa`, `ItÃ¡lia`, `famÃ­lia`, `atÃ©`, `simulaÃ§Ã£o`, `VocÃª`, `recomendaÃ§Ã£o`, `preferÃªncias`, `preÃ§o`, `PreferÃªncia`, `SugestÃµes` | Formulário principal da landing e dashboard segue com várias strings corrompidas | Corrigir todas as ocorrências visíveis | Alta |
| `components/trip/ai-trip-form.tsx` | `Descreva sua viagem em uma frase para eu montar a simulaÃ§Ã£o.` | Mensagem de erro principal com encoding quebrado | `Descreva sua viagem em uma frase para eu montar a simulação.` | Alta |
| `components/trip/ai-trip-form.tsx` | `VocÃª jÃ¡ usou sua busca gratuita.` | Mensagem de bloqueio de busca gratuita com acentuação quebrada | `Você já usou sua busca gratuita.` | Alta |
| `components/trip/ai-trip-form.tsx` | `Perfil opcional da viagem` / subtítulo | O título está claro, mas o subtítulo aparece quebrado no arquivo atual | `Personalize a recomendação com estilo, ritmo e preferências` | Alta |
| `components/trip/ai-trip-form.tsx` | `Limpar preferÃªncias` | Botão com acentuação quebrada | `Limpar preferências` | Alta |
| `components/trip/ai-trip-form.tsx` | `Sensibilidade a preÃ§o` | Label quebrado em área central do formulário | `Sensibilidade a preço` | Alta |
| `components/trip/ai-trip-form.tsx` | `PreferÃªncia de voo` | Label quebrado em área central do formulário | `Preferência de voo` | Alta |
| `components/trip/ai-trip-form.tsx` | `Gerando sua viagem...` e `Descobrir viagem` | Sem erro grave, mas convém uniformizar tom com quiz e resultado | Manter ou revisar padrão de CTA em toda a aplicação | Baixa |
| `components/trip/itinerary-pdf-template.tsx` | `normalizePdfText(...)` com grande lista de remendos de texto | Sintoma de correção reativa; risco de novos textos visíveis continuarem quebrados | Corrigir na origem dos textos e manter normalização apenas como fallback | Média |
| `components/admin/admin-panel.tsx` | `UsuÃ¡rios`, `CrÃ©ditos`, `sugestÃ£o`, `crÃ©dito`, `usuÃ¡rio`, `crÃ©ditos disponÃ­veis` | Painel admin também contém vários problemas de encoding | Corrigir todas as ocorrências visíveis no admin | Baixa |

## Pontos específicos sobre confirmação de e-mail

- No código local, a mensagem de confirmação ao usuário existe, mas ainda aparece com inconsistência de escrita:
  - `Confirme seu email antes de entrar.`
  - Sugestão: `Confirme seu e-mail antes de entrar.`
- O HTML real do e-mail do Supabase não está embutido na aplicação, então a revisão visual completa do conteúdo enviado depende da configuração no painel do Supabase.
- Como apoio de conteúdo, vale revisar também o material de configuração manual já documentado no projeto para garantir consistência de tom entre app e e-mail.

## Correções recomendadas para próxima etapa

1. Corrigir primeiro os arquivos de maior impacto comercial e de conversão:
   - `components/trip/result-view.tsx`
   - `components/trip/itinerary-pdf-template.tsx`
   - `components/auth/auth-form.tsx`
   - `components/trip/ai-trip-form.tsx`
   - `components/dashboard/dashboard-header.tsx`

2. Padronizar acentuação e encoding em toda a camada visível da landing:
   - `components/landing/*`
   - `lib/constants/navigation.ts`
   - páginas `login`, `cadastro`, `dashboard`, `resultado`

3. Revisar placeholders e mensagens curtas com foco em clareza:
   - `voce@email.com` → `você@email.com`
   - `Email` → `E-mail`
   - `Comecar` → `Começar`
   - `Orcamento` → `Orçamento`

4. Remover termos pouco profissionais em produção:
   - `mockada`
   - `de forma local`
   - textos que soam como observação interna de produto

5. Após corrigir os textos, fazer uma validação visual manual nos fluxos:
   - landing
   - login/cadastro
   - dashboard
   - geração de viagem
   - resultado
   - download do roteiro
   - créditos/checkout

