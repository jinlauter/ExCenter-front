# Fluxo de Autenticação ExCenter

Guia técnico do funcionamento de autenticação do ExCenter, voltado para **desenvolvedores experientes mas não especialistas em segurança/auth**.

---

## Sumário

1. [Vocabulário rápido](#1-vocabulário-rápido)
2. [Visão geral da arquitetura](#2-visão-geral-da-arquitetura)
3. [Tecnologias usadas](#3-tecnologias-usadas)
4. [Por que cada peça existe (decisões)](#4-por-que-cada-peça-existe-decisões)
5. [Fluxo passo a passo: login](#5-fluxo-passo-a-passo-login)
6. [Fluxo passo a passo: chamada autenticada](#6-fluxo-passo-a-passo-chamada-autenticada)
7. [Fluxo passo a passo: refresh automático](#7-fluxo-passo-a-passo-refresh-automático)
8. [Fluxo passo a passo: logout](#8-fluxo-passo-a-passo-logout)
9. [Defesa contra ataques específicos](#9-defesa-contra-ataques-específicos)
10. [Glossário](#10-glossário)

---

## 1. Vocabulário rápido

| Termo | Em uma linha |
|---|---|
| **Access token** | Senha temporária (15min) que prova "eu sou o usuário X". Usada em toda chamada à API. |
| **Refresh token** | Senha de longa duração (30 dias) usada **apenas** para pedir um novo access token quando o atual expira. |
| **JWT** | Formato comum de access token: três pedaços base64 (`header.payload.signature`). O servidor consegue verificar autenticidade só checando a assinatura, sem precisar consultar o banco. |
| **Cookie httpOnly** | Cookie que JavaScript **não consegue ler**. Browser envia normalmente em requests, mas `document.cookie` não vê. Defesa principal contra XSS. |
| **SameSite=Lax** | Atributo de cookie que bloqueia envio em requests cross-site (de site A pra site B), exceto navegação top-level. Defesa contra CSRF. |
| **BFF (Backend-for-Frontend)** | Padrão arquitetural: o frontend NÃO chama a API diretamente. Tem um servidor intermediário (Next.js no nosso caso) que fica entre browser e API, guardando segredos. |
| **iron-session** | Biblioteca Node que criptografa dados em um cookie. O browser só vê um blob ilegível; só o servidor com a chave consegue descriptografar. |
| **CSRF** | Ataque onde um site malicioso força o browser do usuário a fazer requests autenticados no seu site sem ele perceber. |
| **XSS** | Injeção de JavaScript malicioso na página. Se conseguir, atacante roda código no contexto do usuário. |

---

## 2. Visão geral da arquitetura

```
┌──────────┐                    ┌──────────────┐                    ┌──────────────┐
│ Browser  │ ───── HTTPS ─────▶ │   Next.js    │ ───── HTTPS ─────▶ │  .NET API    │
│  (React) │                    │  (BFF Node)  │                    │  (ExCenter-  │
│          │ ◀── only cookie ──│              │                    │   back)      │
└──────────┘   excenter-session └──────────────┘                    └──────────────┘
                  (criptografado)      ▲
                                       │
                                  Guarda dentro
                                  da sessão:
                                  - accessToken (JWT)
                                  - refreshToken
                                  - userId, username
```

**Três coisas importantes:**

1. **O browser NUNCA tem acesso aos tokens.** Tudo o que ele tem é um cookie `excenter-session` opaco e criptografado.
2. **O Next.js é o tradutor.** Recebe requests do browser, descriptografa a sessão, adiciona `Authorization: Bearer <accessToken>` e repassa pro .NET.
3. **O .NET não sabe que existe o Next.** Pra ele, é só um cliente HTTP comum mandando JWT.

---

## 3. Tecnologias usadas

| Camada | Tecnologia | Função |
|---|---|---|
| Frontend UI | React 18 + Next.js 14 (App Router) | Renderiza páginas e componentes |
| Frontend BFF | Next.js Route Handlers (`/api/*`) | Intercepta requests do browser, fala com o back |
| Sessão server-side | `iron-session` v8 | Criptografa `{accessToken, refreshToken, …}` em um único cookie httpOnly |
| Decodificação JWT | `jose` | Lê o payload do JWT pra extrair `sub` (userId) sem precisar chamar `/me` |
| Validação de body | `zod` | Garante shape correto das credenciais antes de chamar o back |
| API server | ASP.NET Core 10 (.NET 10) | Endpoints `/api/auth/*` e `/api/bloodtests/*` |
| Emissão de JWT | `System.IdentityModel.Tokens.Jwt` (built-in .NET) | Cria e assina tokens HS256 |
| Hash de senha | `BCrypt.Net` (work factor 12) | Hash unidirecional resistente a brute force |
| Rate limit | ASP.NET `RateLimiter` (built-in) | 5 tentativas de login/min/IP |
| Banco | PostgreSQL (Neon) | Tabela `Users` com `PasswordHash` e `RefreshTokenHash` |

---

## 4. Por que cada peça existe (decisões)

### Por que JWT em vez de session ID tradicional?

**Session ID tradicional**: a cada request, o servidor faz lookup no banco/Redis pra validar a sessão. Custo: 1 query extra por request.

**JWT**: o servidor verifica autenticidade só checando a assinatura matematicamente. Não precisa consultar o banco. Custo: ~1ms de criptografia.

**Trade-off do JWT:** uma vez emitido, é difícil "invalidar" antes de expirar (porque é stateless). Por isso o **access token é curto** (15min) — se for comprometido, a janela de uso é pequena.

### Por que dois tokens (access + refresh)?

O access token precisa ser **curto** (15min) por segurança. Mas obrigar o usuário a fazer login a cada 15min é inviável.

Solução: dois tokens.
- Access: curto, usado em cada chamada à API
- Refresh: longo (30 dias), usado **só** pra pedir um novo access quando o atual expira

O refresh é mais "valioso" e fica em rotação (cada uso invalida o anterior).

### Por que BFF em vez de SPA puro?

Sem BFF, o browser precisaria guardar o access token em algum lugar acessível por JavaScript:
- `localStorage` → vulnerável a XSS (qualquer XSS rouba o token)
- `sessionStorage` → idem
- variável em memória → some no reload, e ainda assim XSS pode roubar

Com BFF, o token fica num cookie httpOnly criptografado no servidor Next. **Mesmo que haja XSS no front, não há token pra roubar.** Em 2025/2026, o argumento mais forte pra BFF foi a onda de supply chain attacks via npm (debug, chalk com 2bi downloads/semana). Pacotes confiáveis foram comprometidos — quem tinha tokens no JS perdeu, quem tinha BFF não.

### Por que iron-session em vez de session ID em DB?

Iron-session é **stateless server-side** (não precisa de DB ou Redis): o cookie contém TODA a informação da sessão, criptografada com AES-GCM + HMAC. O servidor descriptografa em cada request usando `SESSION_PASSWORD`.

Vantagem: zero infra extra, escala horizontal trivial (qualquer servidor com a mesma password consegue ler a sessão).
Desvantagem: cookie cresce com a quantidade de dados (limite ~4KB). No nosso caso, ~2KB depois de criptografado — cabe.

### Por que `SameSite=Lax` e não `Strict`?

`Strict` quebra a navegação: se o usuário vier de um link externo (ex: email), o cookie não é enviado e ele aparece deslogado mesmo estando logado. UX ruim.

`Lax` bloqueia cookies em POST/PUT/DELETE cross-site (que é o vetor de CSRF), mas permite em navegação top-level GET. Trade-off correto pra a maioria dos apps.

### Por que ainda precisa de proteção CSRF se já tem SameSite=Lax?

`SameSite=Lax` cobre **a maioria** dos casos de CSRF, mas não todos. POST com `Content-Type: multipart/form-data` ou `text/plain` ou `application/x-www-form-urlencoded` (os "simples", definidos pela spec do Fetch) **não dispara preflight CORS** — o browser envia o cookie automaticamente em request cross-site se for esse Content-Type.

Como nosso upload é multipart, atacante poderia em teoria forjar um form HTML em outro site que submete pra `/api/bloodtests/upload`. Por isso temos `requireSameOrigin()` que compara `Origin` com `Host` em todas as rotas que alteram estado.

---

## 5. Fluxo passo a passo: login

```
1. Usuário digita username/password e clica "Entrar"

2. Browser:
   POST http://localhost:3000/api/login
   Content-Type: application/json
   Body: { "username": "...", "password": "..." }

3. Next route handler /api/login:
   a) Verifica Origin == Host (CSRF check)
   b) Valida body com zod
   c) Chama o back:
        POST http://localhost:5287/api/auth/login
        Content-Type: application/json
        Body: { "username": "...", "password": "..." }

4. .NET AuthController.Login:
   a) Rate limiter: confere se IP fez < 5 tentativas no último minuto
   b) AuthService.LoginAsync:
      - Busca user pelo username no Postgres
      - Roda BCrypt.Verify(password, user.PasswordHash)
         (ou dummy hash se user não existe — proteção timing attack)
      - Se OK: chama JwtTokenService para emitir tokens
      - Salva hash SHA-256 do refresh no banco (campo RefreshTokenHash)
   c) Devolve:
        200 OK
        { accessToken, expiresAt, username, refreshToken, refreshTokenExpiresAt }

5. Next, ainda em /api/login:
   a) Decoda o JWT pra extrair "sub" (userId)
   b) Monta SessionData:
        { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt,
          username, userId }
   c) Criptografa com iron-session usando SESSION_PASSWORD
   d) Devolve ao browser:
        200 OK
        Set-Cookie: excenter-session=<blob criptografado>;
                    HttpOnly; SameSite=Lax; Path=/; Secure (em prod)
        Body: { username }    ← só username; tokens NÃO vão

6. Browser:
   - Armazena o cookie excenter-session (httpOnly — JS não consegue ler)
   - Redireciona pra /home
```

**Pontos importantes:**
- O `username` no body da resposta é só pra UX (mostrar "Olá, fulano" imediatamente). Mesmo que faltasse, o `/home` faria SSR e leria da sessão.
- O `password` em texto puro existe **apenas** entre browser e Next, e entre Next e back. Em produção, ambas as hops são HTTPS.

---

## 6. Fluxo passo a passo: chamada autenticada

Exemplo: usuário acessa `/home` (página protegida).

```
1. Browser:
   GET http://localhost:3000/home
   Cookie: excenter-session=<blob>

2. Next middleware (Edge):
   - Vê que /home está na lista de rotas protegidas
   - Confere que o cookie excenter-session EXISTE (não descriptografa —
     edge runtime não tem o crypto necessário pro iron-session)
   - Se ausente: 307 → /login
   - Se presente: passa pro handler

3. Next App Router renderiza app/(app)/home/page.tsx (server component):
   - Chama getSession() de @/lib/session
   - iron-session descriptografa o cookie com SESSION_PASSWORD
   - Lê session.username e usa direto no JSX

4. Browser recebe HTML completo. Nenhuma chamada à API foi necessária.
```

E se a página precisar de dados do back?

```
5. Server component chama backendFetch('/api/bloodtests/results/query'):

6. lib/backend.ts:
   a) getSession() → tem accessToken
   b) fetch('http://localhost:5287/api/bloodtests/results/query', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

7. .NET API:
   - JwtBearerAuthentication valida o token (assinatura + iss + aud + exp)
   - Se OK: action method executa, devolve JSON
   - Se não: 401

8. Next recebe o JSON. Server component renderiza com os dados.

9. Browser recebe HTML já preenchido.
```

---

## 7. Fluxo passo a passo: refresh automático

Quando o access token expira (15min depois do login), o back devolve 401 na próxima chamada. O Next refresh **automaticamente**, sem o usuário perceber.

```
1. Next chama o back:
   GET /api/bloodtests/.../...
   Authorization: Bearer <accessToken expirado>

2. .NET responde:
   401 Unauthorized

3. Next em lib/backend.ts detecta o 401:
   a) Confere que ainda tem refreshToken na sessão
   b) Chama o back:
        POST http://localhost:5287/api/auth/refresh
        Authorization: Bearer <refreshToken>

4. .NET AuthController.Refresh:
   a) AuthService.RefreshAsync:
      - Valida assinatura + audience do refresh
      - Extrai userId do "sub"
      - Carrega user do DB
      - Compara SHA-256(refreshToken recebido) com user.RefreshTokenHash
         (proteção contra reuso de refresh antigo)
      - Se OK: emite novo access + novo refresh
      - Atualiza user.RefreshTokenHash no DB com hash do NOVO refresh
   b) Devolve:
        200 OK
        { accessToken, expiresAt, username, refreshToken, refreshTokenExpiresAt }

5. Next:
   a) Atualiza a sessão iron-session com os novos tokens
   b) Re-tenta a chamada original com o novo access
   c) Devolve o resultado ao browser

6. Browser: nunca soube que houve refresh.
```

**Por que rotação?** Se um atacante de algum jeito capturou o refresh token antigo, na primeira vez que ele usar, o hash do banco já não bate mais (porque o cliente legítimo já rotacionou). Detecção + invalidação automática.

---

## 7b. Fluxo passo a passo: login social (Google e Microsoft)

Suportamos dois provedores: Google e Microsoft (Entra ID). O fluxo é idêntico — só mudam URLs, parâmetros e a forma de validar o issuer no back. Setup das credenciais em [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) e [MICROSOFT_OAUTH_SETUP.md](MICROSOFT_OAUTH_SETUP.md).

```
1. Usuário clica "Continuar com Google"
   Browser: window.location = /api/auth/google/start

2. Next /api/auth/google/start:
   a) Gera state (anti-CSRF) + PKCE (code_verifier + code_challenge)
   b) Criptografa { state, verifier } num cookie httpOnly efêmero (10 min)
   c) Redireciona pro Google:
        https://accounts.google.com/o/oauth2/v2/auth?
          client_id=...&redirect_uri=.../callback&response_type=code
          &scope=openid email profile&state=...&code_challenge=...&code_challenge_method=S256

3. Usuário autentica no Google e autoriza

4. Google redireciona de volta:
   GET /api/auth/google/callback?code=...&state=...

5. Next /api/auth/google/callback:
   a) Lê o cookie efêmero, descriptografa { state, verifier }
   b) Confere que state do cookie == state da URL (anti-CSRF)
   c) Troca o code por id_token:
        POST https://oauth2.googleapis.com/token
          client_id, client_secret, code, code_verifier, grant_type, redirect_uri
   d) Recebe o id_token (JWT assinado pelo Google)
   e) Chama o back:
        POST http://localhost:5287/api/auth/google
        Body: { idToken }

6. .NET AuthController.Google → AuthService.GoogleLoginAsync:
   a) IExternalIdTokenValidator valida o id_token:
      - assinatura RS256 contra as chaves públicas do Google (JWKS)
      - aud == nosso Client ID
      - iss == accounts.google.com
      - exp ok
   b) Procura ExternalLogin (provider=google, subject=<sub>)
      - Achou → usa o User vinculado
      - Não achou + email_verified + existe User com Username=email → VINCULA
      - Não achou → cria User novo (Username=email) + ExternalLogin
   c) Emite accessToken + refreshToken (mesmo fluxo do login normal)
   d) Devolve { accessToken, expiresAt, username, refreshToken, refreshTokenExpiresAt }

7. Next monta a sessão iron-session (igual login normal), limpa o cookie
   efêmero, redireciona pra /home.
```

**Pontos de segurança:**
- **state**: impede que um atacante force um callback forjado (CSRF no OAuth).
- **PKCE**: mesmo que alguém intercepte o `code`, não consegue trocá-lo por token sem o `code_verifier` (que ficou no cookie httpOnly do Next).
- **Validação dupla do id_token**: o Next obtém o token, mas quem decide se é válido é o **back** (valida assinatura + audience + issuer). O Next não confia no token cegamente.
- **email_verified**: só vinculamos a uma conta de senha pré-existente se o provedor confirma que o usuário controla aquele email. Para Microsoft, derivamos `email_verified = (email presente no id_token)` — a plataforma valida o email na criação da conta.

**Diferenças entre os dois provedores** (resumo; detalhes em `MICROSOFT_OAUTH_SETUP.md`):
- Identificador estável: Google usa `sub`, Microsoft prefere `oid`.
- Issuer: Google é fixo (`accounts.google.com`); Microsoft varia por tenant (`login.microsoftonline.com/<tenantId>/v2.0`) e validamos por regex.
- Microsoft suporta contas corporativas + pessoais via `tenant=common`.

---

## 8. Fluxo passo a passo: logout

```
1. Usuário clica em "Sair"

2. Browser:
   POST http://localhost:3000/api/logout
   Cookie: excenter-session=<blob>

3. Next /api/logout:
   a) Verifica Origin == Host
   b) Lê a sessão pra pegar o accessToken
   c) DESTRÓI a sessão local (cookie excenter-session = "")
   d) Chama o back (best-effort):
        POST http://localhost:5287/api/auth/logout
        Authorization: Bearer <accessToken>

4. .NET AuthController.Logout:
   a) AuthService.RevokeAsync(userId)
   b) Limpa user.RefreshTokenHash do DB (refresh token deixa de funcionar)
   c) Devolve 204

5. Next responde 204 ao browser. Cliente redireciona pra /login.
```

**Importante**: o access token JWT continua matematicamente válido até expirar (max 15min depois). É a limitação fundamental do JWT stateless. Mitigamos com:
- TTL curto (15min)
- Refresh do DB invalidado imediatamente — sem refresh, nada de novos tokens

---

## 9. Defesa contra ataques específicos

### XSS exfiltra access token
**Não funciona.** Token está em cookie httpOnly. JS não consegue ler. Mesmo com XSS, o atacante não rouba o token.

### Supply chain attack via npm (debug/chalk-style)
**Mesmo defense que XSS.** Pacote malicioso roda no contexto do browser — mesma blindagem. Tokens estão no servidor Next, não no browser.

### CSRF clássico (form HTML em outro site)
**Bloqueado por dois mecanismos:**
1. `SameSite=Lax` no cookie de sessão — não vai em POST cross-site com Content-Type que dispara preflight
2. `requireSameOrigin()` nos route handlers — compara `Origin` com `Host` mesmo em POSTs "simples" (multipart, urlencoded)

### JWT `alg: none` forgery
**Não funciona.** A configuração `JwtBearerOptions` valida assinatura HS256 explicitamente. Tokens sem assinatura são rejeitados.

### Brute force no login
**Bloqueado.** Rate limit 5/min/IP. `ForwardedHeaders` garante IP real atrás de proxy.

### Timing attack (enumerar usernames pelo tempo de resposta)
**Bloqueado.** `AuthService.LoginAsync` sempre roda `BCrypt.Verify`, mesmo quando o usuário não existe (com hash dummy). Tempo de resposta é estatisticamente indistinguível entre "usuário não existe" e "usuário existe, senha errada".

### Refresh token reuso (atacante captura refresh válido)
**Detectado.** Rotação SHA-256 no DB: na primeira vez que o cliente legítimo refrescar depois da captura, o hash muda; o atacante tentando usar o token antigo recebe 401.

### Captura do access token + uso após logout
**Janela máxima 15min.** Não dá pra invalidar JWT antes de expirar (limitação stateless), mas TTL curto + refresh invalidado imediatamente limitam o estrago.

### Subdomain takeover via cookie scope
**Bloqueado.** Cookie sem atributo `Domain` — fica preso ao host exato. Subdomínio malicioso não consegue ler.

### HTTP downgrade attack
**Bloqueado em produção.** HSTS configurado (`max-age=1y; includeSubDomains; preload`). Browsers se recusam a acessar via HTTP.

### Clickjacking (site malicioso colocando o ExCenter em iframe)
**Bloqueado.** `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`.

### Carga de scripts externos
**Bloqueado.** CSP restritivo: só `script-src 'self'` em produção.

---

## 10. Glossário

| Termo | Definição |
|---|---|
| **AES-GCM** | Algoritmo de criptografia simétrica autenticado. iron-session usa internamente. |
| **BCrypt** | Função de hash de senha resistente a brute force. Aumenta o custo computacional intencionalmente (work factor). |
| **HMAC** | Hash-based Message Authentication Code. Garante que dados não foram alterados. iron-session usa AES-GCM que já tem autenticação embutida. |
| **HS256** | HMAC-SHA256. Algoritmo simétrico de assinatura de JWT — mesma chave assina e verifica. Apropriado quando o emissor e o verificador são o mesmo sistema. |
| **RS256** | RSA-SHA256. Algoritmo assimétrico — chave privada assina, chave pública verifica. Usado quando emissor e verificadores são serviços diferentes. |
| **httpOnly** | Atributo de cookie. Browser nega acesso via `document.cookie`. Só vai em requests HTTP. |
| **JWT claims** | Campos dentro do payload do JWT: `sub` (subject = userId), `name`, `iss` (issuer), `aud` (audience), `exp` (expiration), `nbf` (not before), `jti` (JWT ID). |
| **HSTS** | HTTP Strict Transport Security. Header que diz pro browser: "este domínio só aceita HTTPS por X tempo". |
| **CSP** | Content Security Policy. Header que restringe origens de scripts, styles, fontes, etc. Defesa em profundidade contra XSS. |
| **Sliding window** | Política em que o tempo de expiração é resetado a cada uso. Refresh de 30 dias com sliding = quem usa toda semana fica logado pra sempre. |
| **PII** | Personally Identifiable Information. CPF, email, telefone, etc. |
| **PHI** | Protected Health Information. Subset de PII relacionado à saúde. LGPD trata como "dados sensíveis". |
