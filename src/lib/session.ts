import 'server-only';

import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import { env } from './env';

// =============================================================================
// Sessão server-side criptografada (iron-session)
// =============================================================================
//
// Tudo o que é segredo (accessToken JWT, refreshToken do .NET) fica DENTRO do
// blob criptografado por AES + HMAC do iron-session. O cookie que vai pro
// browser é httpOnly, Secure e SameSite=Lax — JS não consegue ler e o
// servidor só descriptografa com SESSION_PASSWORD.
//
// O cookie REFRESH do .NET nunca chega no browser: o Next captura o
// Set-Cookie do .NET, extrai o valor, guarda aqui dentro, e reenvia
// manualmente no header Cookie do request /refresh seguinte.
// =============================================================================

export interface SessionData {
  /** JWT de acesso emitido pelo back. */
  accessToken: string;
  /** ISO timestamp da expiração do access token. */
  accessExpiresAt: string;
  /** Refresh token bruto (valor do cookie refresh_token do back). */
  refreshToken: string;
  /** Não é fornecido pelo back na resposta; usamos um buffer conservador. */
  refreshExpiresAt?: string;
  username: string;
  userId?: string;
}

export const sessionOptions: SessionOptions = {
  password: env.SESSION_PASSWORD,
  cookieName: env.SESSION_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    // Em produção, https. Em dev local sem TLS, o cookie ainda funciona em
    // localhost mesmo com secure=false; deixamos automático pela env.
    secure: env.NODE_ENV === 'production',
    path: '/',
  },
};

/**
 * Retorna a sessão iron-session do request atual (App Router).
 *
 * Atenção: este import só funciona em route handlers / server components /
 * server actions — não pode ser chamado em código client.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
