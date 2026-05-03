# Supabase Email Templates

Configurar em:

`Supabase Dashboard > Authentication > Emails > Templates`

## Importante

- Em produção, configure `Site URL` com o domínio real do VUEI.
- Em produção, configure `Redirect URLs` com o domínio real do VUEI.
- Se ainda existir `localhost` no ambiente de produção, remova ou deixe apenas para ambiente de desenvolvimento.
- O plano gratuito do Supabase pode manter limitações de remetente.
- Para remover totalmente a identidade visual do Supabase no remetente, configure um SMTP próprio.

## Logo no e-mail

- Use uma logo hospedada publicamente.
- A URL da imagem deve ser `https`.
- Você pode inserir a logo no HTML do template com algo como:

```html
<img
  src="https://seudominio.com/logo-vuei.png"
  alt="VUEI"
  width="160"
  style="display:block;margin:0 auto 24px auto;"
/>
```

## 1. Confirmação de cadastro

Assunto:

`Confirme seu cadastro no VUEI`

Corpo sugerido:

```html
<h2>Olá,</h2>

<p>Você está a um passo de ativar sua conta no VUEI.</p>

<p>Clique no botão abaixo para confirmar seu cadastro e começar a gerar roteiros de viagem inteligentes.</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display:inline-block;padding:14px 24px;border-radius:999px;background:#004aad;color:#ffffff;text-decoration:none;font-weight:600;"
  >
    Confirmar minha conta
  </a>
</p>

<p>Se você não criou uma conta no VUEI, ignore este e-mail.</p>
```

## 2. Recuperação de senha

Assunto:

`Redefina sua senha do VUEI`

Corpo sugerido:

```html
<h2>Olá,</h2>

<p>Recebemos uma solicitação para redefinir sua senha no VUEI.</p>

<p>Clique no botão abaixo para criar uma nova senha.</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display:inline-block;padding:14px 24px;border-radius:999px;background:#004aad;color:#ffffff;text-decoration:none;font-weight:600;"
  >
    Redefinir senha
  </a>
</p>

<p>Se você não solicitou isso, ignore este e-mail.</p>
```

## 3. Magic link

Assunto:

`Acesse sua conta VUEI`

Corpo sugerido:

```html
<h2>Olá,</h2>

<p>Clique no botão abaixo para acessar sua conta no VUEI com segurança.</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display:inline-block;padding:14px 24px;border-radius:999px;background:#004aad;color:#ffffff;text-decoration:none;font-weight:600;"
  >
    Acessar minha conta
  </a>
</p>
```

## Checklist manual no Supabase

- `Site URL`: `https://seudominio.com`
- `Redirect URLs`: incluir URLs reais do VUEI
- Confirmar links de:
  - cadastro
  - recuperação de senha
  - magic link
- Validar que nenhum template de produção aponta para `localhost`
