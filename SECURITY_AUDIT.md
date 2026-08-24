# Security Audit — Frontend (Next.js)

Auditoria realizada em 2026-08-23 sobre o dominio publicado
`https://excenter.vercel.app/` e o codigo-fonte deste repositorio.

Metodologia: revisao estatica de codigo (rotas BFF em `src/app/api/`, `src/lib/`,
middlewares, session, CSRF) combinada com testes HTTP ao vivo (curl contra headers,
cookies, CORS, CSP).

---

## Achado 1 — MEDIUM: SSRF / Path traversal via fileId nao validado nas rotas BFF

### Onde

**Arquivo 1**: `src/app/api/bloodtests/files/[fileId]/download/route.ts`, linha 19:
```typescript
const response = await backendFetchRaw(`/api/bloodtests/files/${fileId}/download${inline ? '?inline=true' : ''}`, {
  method: 'GET',
});
```

**Arquivo 2**: `src/app/api/bloodtests/files/[fileId]/route.ts`, linha 25:
```typescript
await backendFetch<void>(`/api/bloodtests/files/${fileId}`, { method: 'DELETE' });
```

Em ambos, `fileId` e extraido de `await params` (parametro de rota do Next.js) e interpolado
diretamente na URL do backend sem nenhuma validacao.

### Mecanismo de ataque

Um usuario autenticado pode enviar:
```
DELETE /api/bloodtests/files/..%2F..%2Fusers%2Fme/download
```

O Node.js decodifica `%2F` para `/` na construcao da URL, e `backendFetchRaw` faz
request para:
```
GET {BACKEND_URL}/api/bloodtests/files/../../users/me/download
```

Que, apos normalizacao de path, vira:
```
GET {BACKEND_URL}/api/users/me/download
```

Isso permite atingir endpoints do backend que o BFF intencionalmente NAO expoe.

### Impacto

Medium — o atacante precisa estar autenticado (session cookie), e o token JWT limita o
acesso ao que o usuario ja tem permissao no backend. Mas permite bypass da superficie
de API do BFF: se o BFF expoe apenas 5 dos 20 endpoints do backend, o path traversal
abre acesso aos outros 15.

### Mitigacao existente

O backend valida `fileId` como `Guid` na rota (`[HttpGet("files/{fileId:guid}/download")]`
em `BloodTestsController.cs:118`), entao o path traversal cairia em 404 no backend
para esta rota especifica. Porem, a sanitizacao deve acontecer NO BFF antes de
fazer o request — defesa em profundidade.

### Como corrigir

Validar `fileId` como UUID antes de usar. Em AMBOS os arquivos:

**`src/app/api/bloodtests/files/[fileId]/download/route.ts`** — adicionar antes da
linha 18 (inicio do `try`):

```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  if (!UUID_RE.test(fileId)) {
    return NextResponse.json({ message: 'ID invalido.' }, { status: 400 });
  }

  const inline = new URL(request.url).searchParams.get('inline') === 'true';
  // ... resto do codigo inalterado
```

**`src/app/api/bloodtests/files/[fileId]/route.ts`** — mesmo padrao, adicionar antes da
linha 24 (inicio do `try`):

```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  const { fileId } = await params;

  if (!UUID_RE.test(fileId)) {
    return NextResponse.json({ message: 'ID invalido.' }, { status: 400 });
  }

  // ... resto do codigo inalterado
```

A regex pode ser extraida para `src/lib/validation.ts` se preferir reusar.

---

## Achado 2 — LOW: Body de erro do backend repassado inteiro ao cliente

### Onde

Tres rotas BFF repassam `err.body` (o body JSON completo da resposta de erro do backend)
direto ao cliente, sem filtrar campos:

1. **`src/app/api/users/password/route.ts`**, linha 35:
   ```typescript
   if (err instanceof BackendError && err.status === 400) {
     return NextResponse.json(err.body, { status: 400 });
   }
   ```

2. **`src/app/api/users/personal-info/route.ts`**, linha 51:
   ```typescript
   if (err instanceof BackendError && err.status === 400) {
     return NextResponse.json(err.body, { status: 400 });
   }
   ```

3. **`src/app/api/users/language/route.ts`**, linha 35:
   ```typescript
   if (err instanceof BackendError && err.status === 400) {
     return NextResponse.json(err.body, { status: 400 });
   }
   ```

### Mecanismo

Se o backend retornar um 400 com ProblemDetails (incluindo `type`, `title`, `traceId`,
nomes internos de DTO), o BFF repassa tudo ao browser sem filtrar. Isso anula a camada
de isolacao que o BFF deveria fornecer.

### Contraste com padrao correto

Outras rotas do mesmo BFF fazem certo — ex: `files/[fileId]/route.ts` linhas 32-36:
```typescript
if (err instanceof BackendError && (err.status === 404 || err.status === 409)) {
  const message =
    typeof err.body === 'object' && err.body !== null && 'message' in err.body
      ? String((err.body as { message: unknown }).message)
      : 'Nao foi possivel excluir o arquivo.';
  return NextResponse.json({ message }, { status: err.status });
}
```

Esse padrao extrai so o campo `message` do body e descarta o resto.

### Quarto caso — `src/app/api/users/avatar/route.ts`, linha 49-50

```typescript
const response = await backendFetchRaw('/api/users/me/avatar', { method: 'PUT', body: formData });
const data = await response.json().catch(() => null);
return NextResponse.json(data, { status: response.status });
```

Aqui o padrão é diferente: usa `backendFetchRaw` (nao `backendFetch`), e repassa o
`response.json()` inteiro para QUALQUER status (incluindo erros 400/500). O body do
backend chega intacto ao cliente.

### Impacto

Low — requer que o backend retorne info sensivel em erros 400 (o que o Achado 4 do
backend documenta que acontece com validation errors). Combinado, expoem nomes de DTOs,
namespaces e traceId ao browser.

### Como corrigir

**Para as 3 rotas com `err.body`** (`password`, `personal-info`, `language`):
Extrair so o campo `message`:

```typescript
if (err instanceof BackendError && err.status === 400) {
  const message =
    typeof err.body === 'object' && err.body !== null && 'message' in err.body
      ? String((err.body as { message: unknown }).message)
      : 'Dados invalidos.';
  return NextResponse.json({ message }, { status: 400 });
}
```

**Para `avatar/route.ts`** (PUT handler):
Tratar erro de status separadamente:

```typescript
const response = await backendFetchRaw('/api/users/me/avatar', { method: 'PUT', body: formData });

if (!response.ok) {
  const data = await response.json().catch(() => null);
  const message =
    typeof data === 'object' && data !== null && 'message' in data
      ? String(data.message)
      : 'Nao foi possivel salvar a foto.';
  return NextResponse.json({ message }, { status: response.status });
}

const data = await response.json().catch(() => null);
return NextResponse.json(data, { status: 200 });
```

---

## Achado 3 — LOW: safeReturnPath nao bloqueia backslash

### Onde

`src/app/api/session/refresh/route.ts`, linhas 22-25:

```typescript
function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}
```

### Mecanismo

A funcao bloqueia `//host` (double slash, que browsers interpretam como protocol-relative
URL), mas nao bloqueia `\/host` ou `/\host`. Alguns browsers (IE, Edge Legacy) interpretam
`\` como `/` em URLs, tornando `\/evil.com` equivalente a `//evil.com` — um open redirect.

### Impacto

Low — browsers modernos (Chrome, Firefox, Safari, Edge Chromium) NAO tratam `\` como `/`
em paths de redirect. O risco e real apenas para IE/Edge Legacy, que estao em desuso.
Alem disso, o redirect usa `new URL(returnPath, request.url)` que no runtime Node.js
resolve corretamente (nao como URL absoluta).

### Como corrigir

Adicionar check de backslash — custo zero, defesa em profundidade:

```typescript
function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/home';
  return raw;
}
```

---

## Info 1 — CSP usa unsafe-inline para scripts

### Onde

`next.config.mjs` ou middleware que gera o header Content-Security-Policy.

### Status

Limitacao conhecida do Next.js — sem nonce support nativo, `unsafe-inline` e necessario
para inline scripts que o framework injeta (hydration, data prefetch). Isso reduz a
eficacia do CSP contra XSS, mas nao representa vulnerabilidade ativa porque:

1. Nenhum uso de `dangerouslySetInnerHTML`, `.innerHTML`, `eval()` ou `document.write()`
   foi encontrado no codebase
2. Todo dado de usuario e renderizado via JSX (auto-escaped pelo React)
3. Todas as 12 rotas mutantes do BFF chamam `rejectCrossSite()`

### Se quiser melhorar

Next.js 16+ suporta nonces via `experimental.useDeploymentId` — investigar se ja esta
estavel o suficiente para usar.

---

## Boas praticas confirmadas

Estas areas foram auditadas e estao bem implementadas:

1. **Session cookie seguro** — iron-session (AES-256-GCM + HMAC), httpOnly, Secure em prod,
   SameSite=Lax. Tokens (access + refresh) NUNCA chegam ao browser — ficam no cookie
   encriptado, server-side only.

2. **Sem XSS** — Nenhum `dangerouslySetInnerHTML`, `.innerHTML`, `eval()` ou
   `document.write()`. Todo dado de usuario renderizado via JSX (auto-escaped pelo React).
   Grep confirmou: 0 ocorrencias em todo o `src/`.

3. **CSRF protegido** — Todas as 12 rotas mutantes (POST/PUT/DELETE) chamam
   `rejectCrossSite()` como primeira acao. A funcao verifica `Origin` e `Referer` contra
   o host da request — CSRF via form submission de outro dominio e bloqueado.

4. **OAuth seguro** — State anti-CSRF com 32 bytes crypto random, PKCE S256 code verifier.
   State e verifier armazenados em cookie httpOnly com TTL de 10 minutos (nao em URL nem
   localStorage).

5. **Env vars seguras** — `BACKEND_URL` e `SESSION_PASSWORD` sem prefixo `NEXT_PUBLIC_`
   (server-only, nunca chegam ao bundle JS). Schema Zod valida no boot com `.min(32)` para
   SESSION_PASSWORD.

6. **CSP bem configurado** — `default-src 'self'`, `frame-ancestors 'none'`,
   `object-src 'none'`, `form-action 'self'`. Unica concessao e `unsafe-inline` para
   scripts (limitacao Next.js).

7. **HSTS com preload** — `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   presente em todas as respostas (via headers do Vercel).

8. **Sem localStorage sensivel** — Tokens ficam apenas no cookie iron-session. Dados em
   localStorage (se houver) sao somente preferencias de UI.

9. **Nenhum dado sensivel em URL** — Login, refresh, e operacoes sensíveis usam POST/PUT
   body ou cookie, nunca query parameters com tokens.

10. **Dependencias atualizadas** — Next.js 16.3, React 19, Zod 3. Sem CVEs criticos
    conhecidos nas versoes atuais.
