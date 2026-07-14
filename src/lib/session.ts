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
  /**
   * "Lembrar de mim" do login. false = cookie de sessão do browser (some ao
   * fechar); true/ausente = cookie persistente (comportamento padrão do
   * iron-session, ~14 dias) — ver getSession() abaixo.
   */
  remember?: boolean;
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
 *
 * "Lembrar de mim": se a sessão decodificada tiver remember === false, o save()
 * seguinte reemite o cookie SEM maxAge (cookie de sessão do browser, some ao
 * fechar) em vez do maxAge persistente padrão do iron-session (~14 dias).
 * Isso precisa de duas leituras porque o maxAge é decidido nas opções passadas
 * pro getIronSession, e só sabemos o valor de remember depois de decodificar
 * o cookie já existente.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (session.remember === false) {
    return getIronSession<SessionData>(cookieStore, {
      ...sessionOptions,
      cookieOptions: { ...sessionOptions.cookieOptions, maxAge: undefined },
    });
  }
  return session;
}

/**
 * Variante usada só na criação de uma sessão nova (login), quando já sabemos
 * o valor de "remember" escolhido no formulário — sem isso, getSession()
 * decidiria o maxAge com base no cookie ANTERIOR (inexistente/anônimo nesse
 * momento), não no valor que estamos prestes a gravar.
 */
export async function getSessionForLogin(remember: boolean) {
  const cookieStore = await cookies();
  const options: SessionOptions = remember
    ? sessionOptions
    : { ...sessionOptions, cookieOptions: { ...sessionOptions.cookieOptions, maxAge: undefined } };
  return getIronSession<SessionData>(cookieStore, options);
}
