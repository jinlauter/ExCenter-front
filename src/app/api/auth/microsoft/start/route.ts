import { NextResponse } from 'next/server';
import { sealData } from 'iron-session';
import { env, isMicrosoftEnabled } from '@/lib/env';
import { generateState, generatePkce, buildMicrosoftAuthUrl } from '@/lib/oauth/microsoft';

// =============================================================================
// GET /api/auth/microsoft/start
// =============================================================================
// Espelha /api/auth/google/start — gera state + PKCE, salva num cookie efêmero
// criptografado, redireciona pro consent screen da Microsoft.
// =============================================================================

const OAUTH_COOKIE = 'excenter-oauth-ms';
const OAUTH_TTL_SECONDS = 600;

export async function GET() {
  if (!isMicrosoftEnabled) {
    return NextResponse.json(
      { message: 'Login com Microsoft não está configurado neste ambiente.' },
      { status: 503 },
    );
  }

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  const sealed = await sealData(
    { state, verifier },
    { password: env.SESSION_PASSWORD, ttl: OAUTH_TTL_SECONDS },
  );

  const authUrl = buildMicrosoftAuthUrl({ state, codeChallenge: challenge });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_COOKIE, sealed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api/auth/microsoft',
    maxAge: OAUTH_TTL_SECONDS,
  });
  return res;
}
