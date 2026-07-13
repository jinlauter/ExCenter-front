import { NextResponse } from 'next/server';
import { sealData } from 'iron-session';
import { env, isGoogleEnabled } from '@/lib/env';
import { generateState, generatePkce, buildGoogleAuthUrl } from '@/lib/oauth/google';

// =============================================================================
// GET /api/auth/google/start
// =============================================================================
// Inicia o fluxo OAuth com o Google:
//   1. Gera state (anti-CSRF) + PKCE (verifier/challenge)
//   2. Guarda state + verifier num cookie httpOnly efêmero (criptografado)
//   3. Redireciona o browser pro consent screen do Google
// =============================================================================

const OAUTH_COOKIE = 'excenter-oauth';
const OAUTH_TTL_SECONDS = 600; // 10 min pra completar o login

export async function GET() {
  if (!isGoogleEnabled) {
    return NextResponse.json(
      { message: 'Login com Google não está configurado neste ambiente.' },
      { status: 503 },
    );
  }

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  // Criptografa state + verifier no cookie. unsealData no callback recupera.
  const sealed = await sealData(
    { state, verifier },
    { password: env.SESSION_PASSWORD, ttl: OAUTH_TTL_SECONDS },
  );

  const authUrl = buildGoogleAuthUrl({ state, codeChallenge: challenge });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_COOKIE, sealed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    // Restrito ao prefixo do callback — não vaza pra outras rotas.
    path: '/api/auth/google',
    maxAge: OAUTH_TTL_SECONDS,
  });
  return res;
}
