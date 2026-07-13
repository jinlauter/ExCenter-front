# Pendências de Saúde / LGPD

Lista de itens **não implementados** mas necessários para um sistema de saúde em produção no Brasil. Ordenados por urgência prática.

---

## Alta prioridade (LGPD requer)

### 1. Consentimento explícito no cadastro
LGPD art. 7º e 11: tratamento de dados sensíveis (saúde) exige consentimento **específico** e **destacado**. Checkbox "aceito termos" genérico não basta — precisa ser específico para tratamento de dados de saúde.

**Onde:** tela de cadastro (ainda não existe). Quando for criar, exibir resumo do que será feito com os dados + checkbox dedicado.

### 2. Direito ao apagamento ("forget me")
LGPD art. 18, V: titular tem direito de pedir exclusão dos dados.

**O que falta:**
- Endpoint `DELETE /api/users/me` no back
- UI "Excluir minha conta" nas configurações
- Política: soft delete imediato, hard delete após 30 dias (janela pra titular reverter)
- Considerar exclusão em cascata: exames, batches, BloodTestResults

### 3. Direito à portabilidade
LGPD art. 18, V: titular pode pedir os dados em formato estruturado.

**O que falta:**
- Endpoint `GET /api/users/me/export` que devolve JSON ou ZIP com todos os exames + resultados do usuário
- Considerar incluir PDFs originais armazenados

### 4. Log de acesso aos dados (auditoria)
LGPD recomenda registro de operações sobre dados pessoais.

**O que falta:**
- Tabela `DataAccessLog (id, userId, dataSubjectId, action, timestamp, ip)`
- Interceptor/middleware que registra cada GET de exame, query de resultados, exportação
- Endpoint só pro próprio usuário ver "quem (ou qual sistema) acessou meus dados e quando"

### 5. Encryption-at-rest dos dados sensíveis
Hoje contamos com encryption-at-rest do disco do Postgres (Neon ativa por padrão). Para dados de saúde, recomenda-se **field-level encryption** das colunas sensíveis (PatientName, NumericResultValue, StringResultValue).

**Custo:** queries com `WHERE` em campos criptografados ficam impossíveis sem `pgcrypto` ou chave determinística. Trade-off real.

**Solução pragmática:** criptografar com chave da aplicação (KMS) só os campos identificadores (nome do paciente). Resultados ficam em claro mas sem ligação direta ao nome no banco.

---

## Média prioridade (boas práticas de segurança)

### 6. 2FA opcional via TOTP
Permitir usuário ativar Google Authenticator / Authy.

**O que falta:**
- Tabela `UserTotpSecret` no banco
- Endpoint para ativar/desativar
- UI nas configurações
- Login: pedir TOTP code se ativado pro usuário

### 7. Notificação de novo login em device desconhecido
Email pro usuário quando autenticação acontece de IP/UA não visto antes.

**O que falta:**
- Tabela `KnownLogin (userId, ipHash, userAgentHash, lastSeen)`
- Serviço de email transacional (SendGrid, AWS SES)
- Trigger no AuthService.LoginAsync

### 8. Painel "Devices conectados"
Listar sessões ativas + permitir revogação individual.

**O que falta:**
- Mudar `User.RefreshTokenHash` de coluna única pra tabela `UserSession (userId, refreshTokenHash, deviceInfo, lastUsed)`
- Endpoint `GET /api/auth/sessions`
- Endpoint `DELETE /api/auth/sessions/{id}`
- UI nas configurações

### 9. Recovery account robusto
Hoje é stub. Em produção:

**Fluxo:**
- Usuário pede recuperação → back envia email com link único contendo token JWT de uso único (válido 15min)
- Link leva pra `/recuperar-senha?token=...`
- Usuário define nova senha → token é invalidado, sessão atual também (logout em todos devices)

### 10. Filtro de PHI no Sentry
Hoje temos `SendDefaultPii = false`. Mas se uma exception incluir um exame no `state` ou em `req.body`, vai pro Sentry.

**O que falta:** `BeforeSend` no `Sentry.WebHost.UseSentry(...)` que strip:
- Headers `Authorization`, `Cookie`
- Body de `/api/auth/*` (tem senhas)
- Body de `/api/bloodtests/*` (tem PHI)
- Campos `patientName`, `numericResultValue`, etc em qualquer breadcrumb

---

## Baixa prioridade (features de produto)

### 11. Compartilhamento com médicos
Caso de uso clássico: paciente quer mandar 1 exame específico pro médico ver, sem dar acesso à conta inteira.

**Padrão proposto:**
- Usuário gera link tokenizado (`/shared/abc123def`) com validade de N dias
- Link dá read-only acesso a UM exame específico
- Atender médico não precisa ter conta

### 12. Suporte a perfis (paciente vs médico vs cuidador)
Se virar produto B2B+B2C, precisa de modelos de usuário diferentes com permissões diferentes (RBAC).

### 13. Anonimização para analytics
Se quiser analisar uso (ex: parâmetros mais comuns), trabalhar com dataset anonimizado: hashes irreversíveis de userId, sem PatientName.

### 14. Retention policy automática
Política configurável: "exames com mais de N anos são automaticamente arquivados/excluídos". Exigência variável conforme regulamentação (CFM tem regras para prontuários médicos: mínimo 20 anos).

### 15. Backup criptografado
Backups do Postgres devem ser criptografados antes de ir pra storage frio. Hoje Neon faz backup criptografado por padrão; se migrar pra setup próprio, garantir mesma postura.

---

## Considerações que NÃO são bugs mas decisões a tomar

### Sessão de 30 dias é certa pra saúde?

**Decisão atual:** 30 dias.

**Argumentos a favor:**
- Uso esporádico (paciente entra quando faz exame)
- UX ruim se obrigar a logar toda hora

**Argumentos contra:**
- Dados sensíveis — celular roubado fica logado 30 dias
- Maioria dos apps bancários no Brasil exige login a cada uso

**Mitigações se ficar 30 dias:**
- 2FA opcional (item 6)
- Notificação de novo login (item 7)
- Re-autenticação obrigatória pra operações sensíveis (excluir conta, exportar dados, mudar email/senha) — não implementado

**Alternativa:** sessão de 24h por padrão, com opção "lembrar deste dispositivo" no login que sobe pra 30 dias.

### Print/screenshot do exame é vetor não mitigável tecnicamente
Usuário tira print do resultado e manda no WhatsApp. Não há controle técnico. Vale UX com aviso ("Esses dados são sensíveis. Compartilhe com cuidado").

### Telemetria do front
Hoje não temos. Quando colocar, garantir que **nenhuma propriedade** de evento contenha valor de exame ou nome de paciente — só categorias agregadas ("usuário fez upload", "usuário viu histórico").
