import 'server-only';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// =============================================================================
// Proteção CSRF para route handlers do Next
// =============================================================================
//
// Por que isso é necessário:
//   - O cookie de sessão (excenter-session) é SameSite=Lax. Lax bloqueia
//     cookies em POST/PUT/DELETE cross-site QUE TENHAM Content-Type que
//     dispara preflight CORS (ex: application/json).
//   - MAS: POST com Content-Type "simples" (multipart/form-data, text/plain,
//     application/x-www-form-urlencoded) NÃO dispara preflight. O browser
//     envia o cookie automaticamente. Atacante pode forjar form em site
//     externo que submete pra /api/bloodtests/upload (multipart) ou outros.
//   - Server Actions do Next checam Origin/Host automaticamente.
//     Route handlers (que estamos usando aqui) NÃO checam — temos que fazer.
//
// O que fazemos:
//   - Comparamos o header Origin com Host. Se diferentes → 403.
//   - Fallback: alguns clientes legítimos não mandam Origin (curl, etc).
//     Para esses, exigimos que SEC-FETCH-SITE seja "same-origin" ou "none".
//     Cross-site request via form HTML do atacante sempre tem Origin set.
// =============================================================================

export class CsrfError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Garante que o request é same-origin. Lança CsrfError se for cross-site.
 *
 * Chamar no início de toda route handler que altera estado (POST/PUT/DELETE).
 * GET safe-listed não precisa (browser envia cookie cross-site, mas atacante
 * não consegue ler a resposta por causa de CORS).
 */
export async function requireSameOrigin(): Promise<void> {
  const hdrs = await headers();
  const origin = hdrs.get('origin');
  const host = hdrs.get('host');

  // Origin presente: comparar com Host. Se não baterem, é cross-site.
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new CsrfError('Origin header malformado.');
    }
    if (host && originHost === host) return;
    throw new CsrfError(`Origin (${originHost}) diferente de Host (${host}).`);
  }

  // Origin ausente. Exigimos Sec-Fetch-Site para confirmar same-origin
  // (browsers modernos sempre mandam esse header; clientes server-side
  // como Postman/curl, idem ausência aqui — quem está chamando vai ter
  // que mandar Sec-Fetch-Site: same-origin OR none explicitamente).
  const secFetchSite = hdrs.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') return;

  throw new CsrfError('Request cross-site bloqueado (Origin ausente).');
}

/**
 * Wrapper utilitário: roda requireSameOrigin e devolve 403 se falhar.
 * Retorna a Response do 403 ou null se passou. Usar como:
 *
 *   const blocked = await rejectCrossSite();
 *   if (blocked) return blocked;
 *   // ... resto do handler
 */
export async function rejectCrossSite(): Promise<NextResponse | null> {
  try {
    await requireSameOrigin();
    return null;
  } catch (err) {
    if (err instanceof CsrfError) {
      return NextResponse.json({ message: 'Request bloqueado por origem inválida.' }, { status: 403 });
    }
    throw err;
  }
}
