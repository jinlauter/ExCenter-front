import 'server-only';

import { env } from '../env';

// =============================================================================
// Helpers do fluxo OAuth 2.0 / OIDC com a Microsoft (Entra ID).
// =============================================================================
//
// Estrutura paralela ao google.ts (mesma assinatura de funções pra que as
// route handlers fiquem simétricas). Diferenças:
//   - URLs ficam em login.microsoftonline.com/{tenant}/oauth2/v2.0/*
//   - scope inclui "offline_access" pra contas que precisarem do refresh
//     (a Microsoft só devolve id_token + access_token se omitirmos)
//   - prompt=select_account força o seletor mesmo em sessões existentes
//
// A geração de state/PKCE está em google.ts e é provider-agnóstica — vamos
// reaproveitá-la importando de lá.
// =============================================================================

export { generateState, generatePkce } from './google';

function authBaseUrl() {
  const tenant = env.MICROSOFT_TENANT_ID || 'common';
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
}

export function buildMicrosoftAuthUrl(params: { state: string; codeChallenge: string }): string {
  const query = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID!,
    redirect_uri: env.MICROSOFT_REDIRECT_URI!,
    response_type: 'code',
    response_mode: 'query',
    scope: 'openid email profile',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${authBaseUrl()}/authorize?${query.toString()}`;
}

/**
 * Troca authorization code por id_token. Retorna null em falha. Validação do
 * id_token NÃO acontece aqui — quem valida é o back .NET (contra JWKS da
 * Microsoft).
 */
export async function exchangeMicrosoftCode(params: {
  code: string;
  codeVerifier: string;
}): Promise<{ idToken: string } | null> {
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID!,
    client_secret: env.MICROSOFT_CLIENT_SECRET!,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: env.MICROSOFT_REDIRECT_URI!,
    scope: 'openid email profile',
  });

  const res = await fetch(`${authBaseUrl()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { id_token?: string };
  return data.id_token ? { idToken: data.id_token } : null;
}
