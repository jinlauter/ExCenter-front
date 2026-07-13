import { z } from 'zod';

// =============================================================================
// Validação das env vars server-only.
//
// Falha alto e cedo se algo estiver faltando — preferimos derrubar o servidor
// no boot a descobrir só na primeira request que o SESSION_PASSWORD não existe.
//
// IMPORTANTE: este módulo NUNCA deve ser importado de client components.
// Como nenhuma variável tem prefixo NEXT_PUBLIC_, importar daqui em um arquivo
// 'use client' já dá erro de build — o que é a barreira que queremos.
// =============================================================================

const schema = z.object({
  BACKEND_URL: z.string().url(),
  SESSION_PASSWORD: z.string().min(32, 'SESSION_PASSWORD deve ter pelo menos 32 caracteres'),
  SESSION_COOKIE_NAME: z.string().min(1).default('excenter-session'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Login com Google (OPCIONAL) ──────────────────────────────────────────
  // Se as três estiverem presentes, o login com Google fica habilitado.
  // Se faltar qualquer uma, o botão Google some da tela de login.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // ── Login com Microsoft (OPCIONAL) ───────────────────────────────────────
  // Análogo ao Google. MICROSOFT_TENANT_ID define quem pode logar:
  //   "common"        → qualquer conta (corporativa ou pessoal)  ← default
  //   "organizations" → só corporativa
  //   "consumers"     → só pessoal
  //   <tenant-id>     → só este tenant específico
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().url().optional(),
  MICROSOFT_TENANT_ID: z.string().default('common'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuração de ambiente inválida:', parsed.error.flatten().fieldErrors);
  throw new Error('Variáveis de ambiente inválidas. Verifique seu .env.local.');
}

export const env = parsed.data;

/**
 * Login com Google está habilitado? True só se as três env vars do Google
 * estiverem presentes. Usado tanto pelas route handlers quanto pela tela de
 * login (pra decidir se renderiza o botão).
 */
export const isGoogleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI,
);

/** Login com Microsoft está habilitado? Mesma lógica do Google. */
export const isMicrosoftEnabled = Boolean(
  env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET && env.MICROSOFT_REDIRECT_URI,
);
