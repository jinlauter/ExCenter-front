# ExCenter-front

Frontend do ExCenter — React 18 + Vite + Material UI v5, integrado com o backend `ExCenter-back` (.NET 10 C#).

## Como rodar

```bash
npm install
npm run dev
```

Por padrão sobe em `http://localhost:5173` (porta que já está na allowlist de CORS do back).

> O back precisa estar rodando em `http://localhost:5287` (ver `ExCenter-back/ExCenter.Api/Properties/launchSettings.json`). Se quiser usar HTTPS (`https://localhost:7144`), ajuste `VITE_API_BASE_URL` no `.env`.

## Variáveis de ambiente

Arquivo `.env` (já incluído):

```
VITE_API_BASE_URL=http://localhost:5287
```

## Estrutura

```
src/
  api/
    client.js       # axios + interceptor de refresh automático em 401
    tokenStore.js   # access token em memória (recomendação do back)
    auth.js         # POST /login, /refresh, /logout, GET /me
    bloodTests.js   # POST /upload (+ batch status e query, para uso futuro)
  auth/
    AuthContext.jsx # provider com user + login/logout, hidrata via /me
    ProtectedRoute.jsx
  components/
    Sidebar.jsx     # sidebar comum às telas autenticadas
  pages/
    LoginPage.jsx        # integrada com POST /api/auth/login
    HomePage.jsx         # integrada com POST /api/bloodtests/upload + GET /me
    SentExamsPage.jsx    # PLACEHOLDER
    HistoryPage.jsx      # PLACEHOLDER
  App.jsx
  main.jsx
  theme.js
```

## Integrações implementadas

| Tela | Endpoint do back | Status |
|---|---|---|
| LoginPage | `POST /api/auth/login` | ✅ implementado |
| Boot do app | `POST /api/auth/refresh` + `GET /api/auth/me` | ✅ implementado (restaura sessão ao recarregar) |
| Sidebar (botão sair) | `POST /api/auth/logout` | ✅ implementado |
| HomePage (saudação + avatar) | `GET /api/auth/me` | ✅ implementado |
| HomePage (upload) | `POST /api/bloodtests/upload` (multipart `files[]`) | ✅ implementado |
| Interceptor global | `POST /api/auth/refresh` em 401 | ✅ implementado (1 tentativa por request, sem loop) |

## TODOs / pontos para revisar com o back

### Fora do escopo desta entrega — telas só com placeholder
- **`SentExamsPage`** (`/exames-enviados`): hoje só uma tela "Em construção". O back tem `GET /api/bloodtests/batch/{batchId}` (status de um upload específico) e `POST /api/bloodtests/results/query` (lista resultados com filtros), mas **não há endpoint que liste os batches do usuário autenticado** — sugestão: criar `GET /api/bloodtests/batches`.
- **`HistoryPage`** (`/historico`): só placeholder. O endpoint `POST /api/bloodtests/results/query` parece dar a base, mas falta UX de comparação por parâmetro.

### Funcionalidades visuais sem back equivalente
- **"Lembrar de mim"** no login: hoje o checkbox não muda nada. O back sempre emite refresh token de 7 dias. Definir o que deve mudar (sessão curta vs longa?).
- **"Esqueci minha senha"**: link com `TODO` no console — back ainda não tem fluxo de recuperação.
- **"Criar conta"**: link com `TODO` no console — back só tem `POST /api/auth/dev/hash` (utilidade de dev), sem endpoint público de cadastro.
- **Login social (Google/Apple)**: visual presente, sem backend correspondente.
- **Contagem "X exames processados"** no card de atalho da home: substituí por texto neutro ("Acompanhe o processamento dos seus envios") porque o back não tem endpoint de contagem. Sugestão: `GET /api/bloodtests/count`.

### Detalhes do upload
- O endpoint `POST /api/bloodtests/upload` retorna `202` com `batchId`. Não fazemos polling do status (decisão de produto). Usuário é direcionado para "Exames enviados" via link no toast de sucesso.
- Validação de extensão no front aceita PDF/JPG/PNG (mesmas extensões do back). Não há limite de tamanho do lado do front — back também não impõe (potencial TODO, ver `What Doesn't Work` no `PROJECT_SUMMARY.md`).

### Segurança / armazenamento de token
Seguindo a recomendação explícita do back (`AuthDtos.cs`):
- Access token em variável em memória (não em localStorage).
- Cookie `refresh_token` httpOnly gerenciado pelo browser (`withCredentials: true` em todas as chamadas).
- No reload da aba, `AuthProvider` chama `POST /api/auth/refresh` automaticamente para restaurar a sessão.

## Como criar um usuário pra testar

Como o back ainda não tem cadastro, use o endpoint utilitário (só em dev):

```bash
# 1. Gerar hash bcrypt da senha
curl -X POST http://localhost:5287/api/auth/dev/hash \
  -H "Content-Type: application/json" \
  -d '"minha-senha"'

# 2. Inserir no Postgres
INSERT INTO "Users" ("Id","Username","PasswordHash","CreatedAt")
VALUES (gen_random_uuid(), 'admin', '<hash-retornado>', NOW());
```

Depois, basta logar no front com `admin` / `minha-senha`.
