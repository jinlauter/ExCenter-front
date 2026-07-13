import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { env, isMicrosoftEnabled } from '@/lib/env';
import { exchangeMicrosoftCode } from '@/lib/oauth/microsoft';
import { microsoftLoginAndPersistSession } from '@/lib/backend';

// =============================================================================
// GET /api/auth/microsoft/callback?code=...&state=...
// =============================================================================
// Espelha /api/auth/google/callback: valida state, troca code por id_token,
// envia ao back que valida e devolve nossos tokens. Persiste a sessão e
// redireciona pra /home. Qualquer falha cai em /login?error=microsoft.
// =============================================================================

const OAUTH_COOKIE = 'excenter-oauth-ms';

function fail(request: NextRequest, reason: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', 'microsoft');
  const res = NextResponse.redirect(url);
  res.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth/microsoft' });
  console.warn(`[microsoft-callback] falhou: ${reason}`);
  return res;
}

export async function GET(request: NextRequest) {
  if (!isMicrosoftEnabled) return fail(request, 'microsoft não configurado');

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return fail(request, `microsoft retornou error=${oauthError}`);
  if (!code || !state) return fail(request, 'code ou state ausente');

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

  if (saved.state !== state) return fail(request, 'state não confere (possível CSRF)');

  const tokens = await exchangeMicrosoftCode({ code, codeVerifier: saved.verifier });
  if (!tokens) return fail(request, 'troca de code falhou');

  const ok = await microsoftLoginAndPersistSession(tokens.idToken);
  if (!ok) return fail(request, 'back recusou o id_token');

  const res = NextResponse.redirect(new URL('/home', request.url));
  res.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth/microsoft' });
  return res;
}
