import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { env, isGoogleEnabled } from '@/lib/env';
import { exchangeGoogleCode } from '@/lib/oauth/google';
import { googleLoginAndPersistSession } from '@/lib/backend';

// =============================================================================
// GET /api/auth/google/callback?code=...&state=...
// =============================================================================
// Recebe o redirect do Google após o consentimento:
//   1. Valida state contra o cookie (anti-CSRF)
//   2. Troca o code por id_token (com PKCE verifier do cookie)
//   3. Envia id_token ao back, que valida e devolve nossos tokens
//   4. Persiste a sessão e redireciona pra /home
//
// Qualquer falha redireciona pra /login?error=google (sem vazar detalhes).
// =============================================================================

const OAUTH_COOKIE = 'excenter-oauth';

function fail(request: NextRequest, reason: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', 'google');
  const res = NextResponse.redirect(url);
  // Limpa o cookie efêmero independentemente do motivo.
  res.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth/google' });
  // reason fica só no log do servidor — não vai pra URL.
  console.warn(`[google-callback] falhou: ${reason}`);
  return res;
}

export async function GET(request: NextRequest) {
  if (!isGoogleEnabled) {
    return fail(request, 'google não configurado');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return fail(request, `google retornou error=${oauthError}`);
  if (!code || !state) return fail(request, 'code ou state ausente');

  // Recupera state + verifier do cookie efêmero.
  const sealed = request.cookies.get(OAUTH_COOKIE)?.value;
  if (!sealed) return fail(request, 'cookie oauth ausente/expirado');

  let saved: { state: string; verifier: string };
  try {
    saved = await unsealData<{ state: string; verifier: string }>(sealed, {
      password: env.SESSION_PASSWORD,
    });
  } catch {
    return fail(request, 'cookie oauth inválido');
  }

  // Anti-CSRF: o state do callback tem que bater com o que guardamos.
  if (saved.state !== state) return fail(request, 'state não confere (possível CSRF)');

  // Troca o code por id_token.
  const tokens = await exchangeGoogleCode({ code, codeVerifier: saved.verifier });
  if (!tokens) return fail(request, 'troca de code falhou');

  // Back valida o id_token e devolve nossos tokens; persiste a sessão.
  const ok = await googleLoginAndPersistSession(tokens.idToken);
  if (!ok) return fail(request, 'back recusou o id_token');

  const res = NextResponse.redirect(new URL('/home', request.url));
  res.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth/google' });
  return res;
}
