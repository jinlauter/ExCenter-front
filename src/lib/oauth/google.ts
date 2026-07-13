import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { env } from '../env';

// =============================================================================
// Helpers do fluxo OAuth 2.0 Authorization Code + PKCE com o Google.
// =============================================================================
//
// O Next atua como cliente OAuth confidential (tem client_secret). Mesmo assim
// usamos PKCE — recomendação da OAuth 2.1 para TODOS os clientes, protege o
// authorization code contra interceptação.
//
// Fluxo:
//   /api/auth/google/start    → gera state + PKCE, redireciona pro Google
//   (usuário autentica no Google)
//   /api/auth/google/callback → valida state, troca code por id_token
// =============================================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** State anti-CSRF: valor aleatório imprevisível, conferido no callback. */
export function generateState(): string {
  return randomBytes(32).toString('hex');
}

/** Par PKCE: verifier (secreto, fica no cookie) + challenge (vai pro Google). */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Monta a URL de autorização do Google para onde o browser será redirecionado. */
export function buildGoogleAuthUrl(params: { state: string; codeChallenge: string }): string {
  const query = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    // Sempre mostra o seletor de conta (evita login silencioso indesejado).
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
}

/**
 * Troca o authorization code pelo id_token. Retorna o id_token (JWT do Google)
 * ou null em falha. NÃO valida o id_token aqui — quem valida é o back .NET
 * (contra as chaves públicas do Google).
 */
export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
}): Promise<{ idToken: string } | null> {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { id_token?: string };
  return data.id_token ? { idToken: data.id_token } : null;
}
