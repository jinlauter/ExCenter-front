# Setup do Login com Google

Passo a passo pra habilitar "Continuar com Google" no ExCenter. Sem essas credenciais, o botão Google aparece desabilitado.

---

## 1. Criar credenciais no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/).
2. Crie um projeto (ou selecione um existente). Ex: "ExCenter".
3. No menu lateral: **APIs e serviços → Tela de consentimento OAuth**.
   - Tipo: **Externo** (a menos que seja Google Workspace interno).
   - Preencha nome do app, email de suporte, domínios. Pra dev local, o mínimo basta.
   - Em **Escopos**, adicione: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - Em **Usuários de teste**, adicione os emails que vão testar (enquanto o app estiver em modo "Testing").
4. No menu lateral: **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: "ExCenter Web".
   - **URIs de redirecionamento autorizados** — adicione EXATAMENTE:
     ```
     http://localhost:3000/api/auth/google/callback
     ```
     (Em produção, adicione também `https://seu-dominio.com/api/auth/google/callback`.)
   - Clique em **Criar**.
5. Copie o **Client ID** e o **Client Secret** que aparecem.

---

## 2. Configurar o frontend (Next)

No `.env.local` do `ExCenter-front`:

```bash
GOOGLE_CLIENT_ID=<seu-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<seu-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

> O `GOOGLE_REDIRECT_URI` precisa ser **idêntico** ao configurado no Console (incluindo http vs https e porta).

---

## 3. Configurar o backend (.NET)

O back precisa do **mesmo Client ID** pra validar a audience do id_token. No `appsettings.Development.json` do `ExCenter-back`:

```json
{
  "Google": {
    "ClientId": "<seu-client-id>.apps.googleusercontent.com"
  }
}
```

Em produção, use a env var `Google__ClientId`.

> O back **não** precisa do Client Secret — só o Next usa o secret pra trocar o code por tokens. O back só valida o id_token contra as chaves públicas do Google.

---

## 4. Reiniciar e testar

1. Reinicie o back (`dotnet run --project ExCenter.Api`) — a migration `AddExternalLogins` roda automaticamente no boot.
2. Reinicie o front (`npm run dev`).
3. Acesse `http://localhost:3000/login`. O botão **Google** deve estar habilitado.
4. Clique → autentique no Google → você volta logado em `/home`.

---

## Como funciona (resumo técnico)

```
Browser → GET /api/auth/google/start          (Next)
            ↓ gera state + PKCE, salva em cookie httpOnly efêmero
            ↓ redireciona pro Google
Google  → consent screen → redireciona de volta:
Browser → GET /api/auth/google/callback?code=...&state=...   (Next)
            ↓ valida state (anti-CSRF)
            ↓ troca code por id_token (com PKCE verifier)
            ↓ POST /api/auth/google { idToken }  →  .NET
.NET    → valida id_token contra chaves públicas do Google
            ↓ cria/vincula User + ExternalLogin
            ↓ devolve { accessToken, refreshToken, ... }
Next    → monta sessão iron-session, redireciona /home
```

O id_token **nunca** chega ao browser. Tudo acontece server-side no Next + .NET.

---

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Botão Google desabilitado | Falta alguma das 3 env vars no `.env.local`. Reinicie o `npm run dev` após editar. |
| `redirect_uri_mismatch` no Google | O `GOOGLE_REDIRECT_URI` não bate exatamente com o configurado no Console. |
| Volta pra `/login?error=google` | Veja o log do servidor Next (`[google-callback] falhou: ...`). Causas comuns: state expirado (demorou > 10min), `Google:ClientId` diferente entre front e back, app em modo Testing e email não está na lista de test users. |
| `Não foi possível autenticar com o Google` (401 do back) | `Google:ClientId` no back está vazio ou diferente do usado no front (audience não confere). |

---

## Nota sobre o Apple (ainda não implementado)

O botão Apple continua como TODO. O fluxo "Sign in with Apple" é parecido, mas tem complicações extras:

- O `client_secret` da Apple **não é estático** — é um JWT que você assina com uma private key (.p8) gerada no Apple Developer Portal, válido por no máximo 6 meses. Precisa de rotação.
- A Apple só manda `name` e `email` **na primeira** autorização — depois disso, só o `sub`. Tem que persistir no primeiro callback.
- Exige conta paga no Apple Developer Program ($99/ano).

Quando for implementar, a estrutura (`IExternalIdTokenValidator`, `ExternalLogin`, `/api/auth/apple/*`) já está pronta pra receber — é só adicionar um `ValidateAppleAsync` e as rotas equivalentes.
