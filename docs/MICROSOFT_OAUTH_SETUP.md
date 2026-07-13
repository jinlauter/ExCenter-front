# Setup do Login com Microsoft (Entra ID)

Passo a passo pra habilitar "Continuar com Microsoft" no ExCenter. Sem essas credenciais, o botão Microsoft aparece desabilitado.

A Microsoft Identity Platform (antiga Azure AD, hoje rebatizada como Entra ID) suporta contas pessoais (Outlook/Hotmail/Live) e corporativas (Microsoft 365, Azure AD). Ambas usam o mesmo endpoint OAuth.

---

## 1. Registrar o app no portal do Azure

1. Acesse [portal.azure.com](https://portal.azure.com/) e entre com qualquer conta Microsoft.
2. No menu superior: **Microsoft Entra ID** → painel lateral **App registrations** → **+ New registration**.
3. Preencha:
   - **Name**: ExCenter
   - **Supported account types**: escolha conforme quem deve poder logar.
     - **Accounts in any organizational directory and personal Microsoft accounts** (recomendado para MVP — equivale a tenant `common`)
     - Outras opções restringem a corporativas, pessoais ou um tenant único
   - **Redirect URI**:
     - Tipo: **Web**
     - URL: `http://localhost:3000/api/auth/microsoft/callback` (em produção adicione também a URL HTTPS)
4. Clique em **Register**.
5. Na página do app, anote o **Application (client) ID** que aparece no topo.
6. No painel lateral: **Certificates & secrets** → **+ New client secret**.
   - Description: "ExCenter dev"
   - Expires: 24 months (ou conforme política — Microsoft permite até 24 meses)
   - Copie o **Value** (não o ID — o value é o secret e só aparece uma vez).

---

## 2. Configurar o frontend (Next)

No `.env.local` do `ExCenter-front`:

```bash
MICROSOFT_CLIENT_ID=<application-client-id>
MICROSOFT_CLIENT_SECRET=<client-secret-value>
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

`MICROSOFT_TENANT_ID` controla quem pode logar:

| Valor | Quem pode logar |
|---|---|
| `common` (default) | Qualquer conta Microsoft (corporativa ou pessoal) |
| `organizations` | Só corporativa (work/school) |
| `consumers` | Só pessoal (Outlook/Hotmail/Live) |
| `<tenant-id>` (GUID) | Só este tenant específico |

> O `MICROSOFT_REDIRECT_URI` precisa ser **idêntico** ao registrado no portal (incluindo http vs https, porta, e barra final).

---

## 3. Configurar o backend (.NET)

O back precisa do mesmo Client ID + Tenant pra validar a audience e o issuer. No `appsettings.Development.json` do `ExCenter-back`:

```json
{
  "Microsoft": {
    "ClientId": "<application-client-id>",
    "TenantId": "common"
  }
}
```

Em produção, use env vars `Microsoft__ClientId` e `Microsoft__TenantId`.

> O back **não** precisa do Client Secret — só o Next usa o secret pra trocar o code por tokens. O back só valida o id_token contra as chaves públicas da Microsoft.

---

## 4. Reiniciar e testar

1. Reinicie o back (`dotnet run --project ExCenter.Api`).
2. Reinicie o front (`npm run dev`).
3. Acesse `http://localhost:3000/login`. O botão **Microsoft** deve estar habilitado.
4. Clique → autentique no Microsoft → você volta logado em `/home`.

---

## Como funciona (resumo técnico)

```
Browser → GET /api/auth/microsoft/start                       (Next)
            ↓ gera state + PKCE, salva em cookie httpOnly efêmero
            ↓ redireciona pra login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
Microsoft → consent screen → redireciona de volta:
Browser → GET /api/auth/microsoft/callback?code=...&state=... (Next)
            ↓ valida state (anti-CSRF)
            ↓ troca code por id_token em /oauth2/v2.0/token (com PKCE verifier)
            ↓ POST /api/auth/microsoft { idToken }  →  .NET
.NET    → busca JWKS da Microsoft (/discovery/v2.0/keys, cacheado)
            ↓ valida assinatura RS256, audience, issuer (regex de tenant)
            ↓ extrai "oid" (Object ID, identificador estável)
            ↓ cria/vincula User + ExternalLogin (provider="microsoft")
            ↓ devolve { accessToken, refreshToken, ... }
Next    → monta sessão iron-session, redireciona /home
```

---

## Diferenças vs Google

| | Google | Microsoft |
|---|---|---|
| Identificador estável | `sub` | `oid` (preferido) ou `sub` |
| `email_verified` claim | sim, sempre presente | não emite — derivamos de "tem email" |
| Issuer | fixo: `accounts.google.com` | varia por tenant: `login.microsoftonline.com/<tenantId>/v2.0` |
| Suporte a contas pessoais + corporativas no mesmo app | n/a | sim, via `tenant=common` |

---

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Botão Microsoft desabilitado | Falta alguma das 3 env vars (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) no `.env.local`. Reinicie `npm run dev` após editar. |
| `AADSTS50011: reply URL doesn't match` | O `MICROSOFT_REDIRECT_URI` não bate com o configurado no portal. |
| `AADSTS70011: invalid scope` | Algum problema com os scopes. Verifique se não modificou `lib/oauth/microsoft.ts`. |
| Volta para `/login?error=microsoft` | Veja o log do servidor Next (`[microsoft-callback] falhou: ...`). Causas comuns: state expirado, `Microsoft:ClientId` diferente entre front e back, secret expirado no portal. |
| `Não foi possível autenticar com a Microsoft` (401 do back) | `Microsoft:ClientId` vazio ou diferente do front. Audience não confere. |
| Login funciona em uma conta mas falha em outra | Pode ser o `TenantId`: `common` aceita tudo; outras opções restringem. |

---

## Cliente secret expira — o que fazer

Microsoft força expiração do client secret (max 24 meses). Quando expirar:

1. Portal Azure → seu app → **Certificates & secrets** → criar novo secret
2. Atualizar `MICROSOFT_CLIENT_SECRET` no `.env.local` / env vars de produção
3. Reiniciar o Next

Pra evitar surpresa: configure alertas de expiração em `Notifications` no portal, e revise antes de 12 meses.
