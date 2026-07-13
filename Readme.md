# ExCenter-front

Frontend do ExCenter em **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui**, integrado ao backend `ExCenter-back` (.NET 10 C#) com arquitetura **BFF (backend-for-frontend)**.

## Por que BFF

O browser **nunca** fala diretamente com o .NET. Toda chamada passa pelo Next, que:

1. Mantém os tokens (`accessToken` JWT e `refreshToken`) dentro de um cookie de sessão criptografado por [`iron-session`](https://github.com/vvo/iron-session).
2. O cookie é `httpOnly`, `SameSite=Lax` (same-origin) e em produção `Secure`. JS no navegador **não consegue ler nada**.
3. Cada route handler do Next injeta `Authorization: Bearer` no servidor antes de chamar o .NET.
4. Em 401, refresh é automático e transparente (route handler tenta uma vez, atualiza a sessão).
5. O back não emite mais cookie de refresh — refresh token vai no body e é guardado server-side pelo Next.

**Resultado prático**: mesmo que algum pacote do front sofra XSS, não há token JS-acessível para exfiltrar. A barreira de segurança é o `SESSION_PASSWORD` do servidor.

## Modelo de ameaças e mitigações

| Vetor de ataque | Mitigação |
|---|---|
| **XSS exfilta access token** | Token em cookie iron-session AES-encrypted server-side. JS no browser não consegue ler. |
| **Supply chain (debug/chalk-style npm attacks)** | Mesma defesa do XSS — nenhum token acessível no JS, mesmo se pacote comprometido. |
| **CSRF em POST simples (multipart, urlencoded)** | `requireSameOrigin()` aplicado em todos os route handlers que alteram estado. Compara `Origin` com `Host`; rejeita 403 se diferente. |
| **CSRF em POST application/json** | Preflight CORS + SameSite=Lax (cookie de sessão não é enviado em cross-site POST com Content-Type que dispara preflight). |
| **JWT `alg: none` forgery** | Back valida assinatura HS256 explicitamente. |
| **JWT secret fraco** | Back falha no boot se `Jwt:SecretKey` < 32 chars ou é placeholder. |
| **Brute force no login** | Rate limit 5/min/IP no back + `ForwardedHeaders` para preservar IP atrás de proxy. |
| **Timing attack (enumeração de usernames)** | Back roda BCrypt.Verify mesmo quando usuário não existe (com dummy hash). Tempo de resposta indistinguível. |
| **Refresh token reuse após captura** | Rotação no back: cada refresh invalida o anterior via hash SHA-256 server-side. |
| **Access token reuse após logout** | TTL curto (15min). Mesmo se atacante captura o token, janela máxima é 15min após o logout. |
| **HTTP downgrade attack** | HSTS em produção (`max-age=1y; includeSubDomains; preload`). |
| **Clickjacking** | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`. |
| **Subdomain takeover via cookie scope** | Cookie de sessão não tem `Domain` set — fica preso ao host exato. |
| **Sniffing de Referer entre domínios** | `Referrer-Policy: strict-origin-when-cross-origin`. |
| **Acesso indevido a câmera/mic** | `Permissions-Policy` desabilita tudo (`camera=(), microphone=(), geolocation=()`). |
| **Carga de scripts externos via XSS** | CSP restritivo: `default-src 'self'`, `script-src 'self'`, `object-src 'none'`. |

### O que conscientemente NÃO mitigamos

| Vetor | Por que não |
|---|---|
| **Trocar HS256 por RS256** | HS256 é apropriado para single-tenant. RS256 só faz sentido quando múltiplos serviços precisam validar tokens emitidos por outro. Não é o caso. |
| **Blacklist de access token** | Mataria a propriedade stateless do JWT. TTL de 15min resolve o cenário prático sem o custo. |
| **CSRF token explícito (double-submit cookie)** | `SameSite=Lax` + `requireSameOrigin()` no servidor cobrem os vetores conhecidos. CSRF token só adicionaria defesa contra ataques bem específicos. |
| **Rotação de session ID em privilege escalation** | Sistema não tem níveis de privilégio. |
| **maxAge curto da sessão (ex: 15min)** | Trade-off UX. Padrão atual herda do refresh do back (7 dias). Vale rever se houver requisito específico. |
| **Race condition no refresh com single-flight** | Pra escala atual, não dispara. Quando o tráfego justificar, implementar lock no Next via Redis/Map. |

## Como rodar

```bash
npm install
npm run dev
```

Sobe em `http://localhost:3000`.

### Pré-requisitos
- **Back rodando** em `http://localhost:5287` (config padrão de `ExCenter-back`)
- **CORS**: como o browser não fala direto com o back, CORS deixa de ser problema. O Next chama o back de servidor pra servidor.
- Arquivo `.env.local` configurado (gerado automaticamente; **substituir `SESSION_PASSWORD` em produção**)

## Variáveis de ambiente

| Variável | Server-only | Função |
|---|---|---|
| `BACKEND_URL` | sim | URL do back .NET |
| `SESSION_PASSWORD` | sim | Chave de criptografia da sessão (mínimo 32 chars) |
| `SESSION_COOKIE_NAME` | sim | Nome do cookie httpOnly (default `excenter-session`) |

Nenhuma usa prefixo `NEXT_PUBLIC_` — todas só existem no runtime do servidor.

## Estrutura

```
src/
  app/
    layout.tsx                # html root, font Inter
    page.tsx                  # redirect / → /home ou /login
    globals.css               # tokens ExCenter (HSL) + Tailwind
    (auth)/login/page.tsx     # tela de login (server)
    (app)/
      layout.tsx              # carrega sessão server-side, renderiza Sidebar
      home/page.tsx           # saudação + upload + atalhos
      exames-enviados/page.tsx  # PLACEHOLDER
      historico/page.tsx        # PLACEHOLDER
    api/
      login/route.ts          # POST → autentica e cria sessão
      logout/route.ts         # POST → limpa sessão + notifica back
      me/route.ts             # GET  → proxy de /api/auth/me
      session/route.ts        # GET  → estado de sessão para client components
      bloodtests/
        upload/route.ts       # POST → repassa multipart pro back com Bearer
  components/
    ui/                       # shadcn (button, input, card, alert, ...)
    login-form.tsx            # client — chama /api/login
    upload-card.tsx           # client — chama /api/bloodtests/upload
    sidebar.tsx               # server — recebe username via props
    sidebar-nav.tsx           # client — usePathname pra realçar item ativo
    logout-button.tsx         # client — chama /api/logout
    brand-icons.tsx           # logos Google/Apple
  lib/
    env.ts                    # validação zod de env vars no boot
    session.ts                # config iron-session + helper getSession
    backend.ts                # fetch wrapper + refresh automático (server-only)
    csrf.ts                   # requireSameOrigin + rejectCrossSite
    utils.ts                  # cn helper
  types/
    api.ts                    # DTOs do back tipados
  middleware.ts               # protege /home, /exames-enviados, /historico
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Next dev server (porta 3000) |
| `npm run build` | Build de produção |
| `npm run start` | Roda o build |
| `npm run lint` / `lint:fix` | ESLint (preset `next/core-web-vitals`) |
| `npm run format` / `format:check` | Prettier (com `prettier-plugin-tailwindcss`) |
| `npm run typecheck` | `tsc --noEmit` |

## Fluxo de autenticação (passo a passo)

```
Browser → POST /api/login                     (Next, mesma origem)
   ↓
Next   → POST {BACKEND}/api/auth/login        (server-side)
   ↓
.NET   → 200 { accessToken, expiresAt, username }
          Set-Cookie: refresh_token=... ; Path=/api/auth
   ↓
Next   parsa Set-Cookie, monta SessionData = {
          accessToken, accessExpiresAt,
          refreshToken (valor capturado do Set-Cookie),
          refreshExpiresAt, username
        }
        Set-Cookie: excenter-session=<encrypted blob>; HttpOnly; SameSite=Lax
   ↓
Browser ← 200 { username }
```

Em chamadas autenticadas subsequentes:

```
Browser → /api/me  (cookie excenter-session vai junto, ele que faz tudo)
   ↓
Next   descriptografa sessão, pega accessToken
   ↓
Next   → GET {BACKEND}/api/auth/me  com Authorization: Bearer ...
   ↓
.NET   → 200 { userId, username }   ou   401 (token expirado)
   ↓
Se 401: Next chama /api/auth/refresh enviando Cookie: refresh_token=<valor da sessão>
        recebe novo accessToken + novo Set-Cookie de refresh
        atualiza a sessão iron-session
        repete a chamada original UMA vez
```

## Integrações implementadas

| Funcionalidade | Endpoint do back | Onde no front |
|---|---|---|
| Login | `POST /api/auth/login` | `POST /api/login` → `loginAndPersistSession` |
| Logout | `POST /api/auth/logout` | `POST /api/logout` → `logoutAndClearSession` |
| Restaurar sessão (boot) | implícito (cookie persiste) | `getSession()` em server components |
| Refresh automático | `POST /api/auth/refresh` | `backendFetch` em 401 |
| Username p/ saudação | `GET /api/auth/me` (ou direto da sessão) | `(app)/layout.tsx` (SSR) |
| Upload de PDFs | `POST /api/bloodtests/upload` | `POST /api/bloodtests/upload` (proxy multipart) |

## TODOs / pontos para revisar com o back

### Fora do escopo desta entrega
- **Exames enviados**: precisa de endpoint que liste batches do usuário. Sugestão: `GET /api/bloodtests/batches`.
- **Histórico**: o `POST /api/bloodtests/results/query` parece atender, mas falta UX de comparação por parâmetro.

### Funcionalidades visuais sem back equivalente
- "Lembrar de mim" — hoje sem efeito (back sempre emite refresh de 7 dias)
- "Esqueci minha senha" — back sem fluxo de recuperação
- "Criar conta" — back só tem `POST /api/auth/dev/hash` (utilidade de dev)
- Login com Google/Apple — visual presente, sem backend
- "X exames processados" no card de atalho — substituí por texto neutro (back sem endpoint de contagem)

### Considerações de produção
- **Gere um `SESSION_PASSWORD` forte**. `openssl rand -hex 32` ou similar. Nunca commit.
- **`secure: true`** no cookie de sessão exige HTTPS. Em dev local, a config detecta `NODE_ENV` e desabilita.
- **`maxDuration` do upload**: configurado pra 60s. Em produção (Node próprio, não Vercel), o ideal é fazer streaming puro em vez de bufferizar em memória. Ver TODO em `app/api/bloodtests/upload/route.ts`.
- **CORS no back**: como o browser fala só com o Next agora, dá pra **remover ou apertar** o `Cors:AllowedOrigins` do `appsettings.json` do back, deixando vazio em prod. Isso fecha mais uma porta.

## Documentação adicional

- **[docs/AUTH_FLOW.md](docs/AUTH_FLOW.md)** — guia técnico do fluxo de autenticação, voltado para devs não-especialistas em segurança. Explica JWT, refresh, BFF, iron-session, CSRF, login com Google (OAuth), fluxos passo a passo.
- **[docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md)** — passo a passo pra habilitar "Continuar com Google" (Google Cloud Console + env vars).
- **[docs/MICROSOFT_OAUTH_SETUP.md](docs/MICROSOFT_OAUTH_SETUP.md)** — passo a passo pra habilitar "Continuar com Microsoft" (Azure Portal + env vars).
- **[docs/HEALTHCARE_TODO.md](docs/HEALTHCARE_TODO.md)** — pendências de LGPD e features de saúde (2FA, notificação de login, compartilhamento com médicos, etc).
- **[tests/security/README.md](tests/security/README.md)** — suite de testes E2E Playwright contra os vetores de ataque cobertos pela auditoria.

## Como criar um usuário pra testar

```bash
# 1. Gerar hash bcrypt (back precisa estar rodando)
curl -X POST http://localhost:5287/api/auth/dev/hash \
  -H "Content-Type: application/json" \
  -d '"minha-senha"'

# 2. Inserir no Postgres
INSERT INTO "Users" ("Id","Username","PasswordHash","CreatedAt")
VALUES (gen_random_uuid(), 'admin', '<hash-retornado>', NOW());
```

Login no front: `admin` / `minha-senha`.
