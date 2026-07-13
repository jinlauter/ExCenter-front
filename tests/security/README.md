# Testes E2E de segurança

Suite Playwright que valida as proteções de auth contra ataques conhecidos. Não substitui pentest profissional; serve como **rede de proteção contra regressões** quando alguém mexer no fluxo de auth.

## Pré-requisitos

1. **Back rodando** em `http://localhost:5287`:
   ```bash
   cd ../ExCenter-back
   dotnet run --project ExCenter.Api
   ```

2. **Postgres acessível** (configurado no `appsettings.json` do back).

3. **Browsers instalados** (uma vez):
   ```bash
   npx playwright install chromium
   ```

4. **Usuário de teste no banco** — alguns testes precisam logar de verdade:
   ```bash
   # Gera o hash
   curl -X POST http://localhost:5287/api/auth/dev/hash \
     -H "Content-Type: application/json" \
     -d '"test-password-123"'

   # No psql do Postgres:
   INSERT INTO "Users" ("Id","Username","PasswordHash","CreatedAt")
   VALUES (gen_random_uuid(), 'test-user', '<HASH-RECEBIDO>', NOW());
   ```

   Testes que dependem do usuário e não encontrarem ele são **skipados silenciosamente**, não falham.

## Rodar

```bash
npm run test:security          # headless
npm run test:security:ui       # UI mode (debug visual)
```

O Playwright sobe o `npm run dev` do front automaticamente. Se já estiver rodando, ele reutiliza.

## Suite

| Arquivo | O que testa |
|---|---|
| `headers.spec.ts` | CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy presentes nas respostas |
| `token-leak.spec.ts` | `localStorage`, `sessionStorage`, `document.cookie`, response bodies — NENHUM contém access/refresh token |
| `csrf.spec.ts` | POST cross-origin em `/api/login`, `/api/logout`, `/api/bloodtests/upload` é rejeitado com 403 |
| `rate-limit.spec.ts` | 6ª tentativa de login em < 1min vira 429 |
| `timing-attack.spec.ts` | Tempo de resposta para "user-inexistente" vs "senha-errada" é estatisticamente indistinguível |
| `unauthorized-access.spec.ts` | Rotas protegidas (/home etc) e route handlers (/api/me etc) sem sessão são bloqueados |
| `cookie-flags.spec.ts` | Cookie `excenter-session` é httpOnly + SameSite=Lax + Secure (em prod) |

## Por que sequencial (workers=1)?

- **Rate limit**: 5/min/IP no back. Testes paralelos derrubam um aos outros.
- **Timing attack**: requer medições estáveis sem competição por CPU.

## Configurando outro ambiente

Sobrescreva via env vars:

```bash
E2E_FRONT_URL=https://staging.excenter.com \
E2E_BACK_URL=https://api-staging.excenter.com \
E2E_TEST_USERNAME=qa-user \
E2E_TEST_PASSWORD=... \
npm run test:security
```

## O que esta suite NÃO cobre

- **SQL injection / parameter tampering**: responsabilidade do back. ORM (EF Core) já protege.
- **Privilege escalation**: sistema não tem níveis de privilégio ainda.
- **Race conditions no refresh**: implementação atual aceita, ver `docs/HEALTHCARE_TODO.md`.
- **Pentest real**: ferramentas como Burp Suite Pro ou OWASP ZAP varrem coisas que a gente não pensou.
- **Cargas pesadas de DOS**: rate limit por IP é fraco contra DDoS distribuído. Em produção depender de Cloudflare/AWS WAF.
