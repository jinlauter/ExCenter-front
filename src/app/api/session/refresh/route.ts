import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { refreshSessionAndSave } from '@/lib/backend';

// =============================================================================
// GET /api/session/refresh?return=<path> (Next BFF)
// =============================================================================
// Renova o access token E persiste o cookie, depois redireciona de volta pra
// página de origem. Existe porque server component NÃO consegue salvar cookie
// durante o render: quando backendFetchOrRedirect detecta o access token
// expirado, ele desvia pra cá em vez de renovar inline. Como o back rotaciona o
// refresh token a cada uso (uso único), renovar sem salvar deixaria o cookie
// preso num refresh token já queimado — o bug do "Sessão expirada" ao abrir um
// exame depois de ficar idle. Aqui (Route Handler) o save() funciona.
//
// Se o refresh falhar (refresh token expirado/rotacionado), destrói a sessão e
// manda pro login — sem loop, porque não redireciona de volta pra página.
// =============================================================================

// Só aceita caminho relativo same-origin no return, pra não virar open redirect
// (nada de "//host", "https://host" ou esquema).
function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

export async function GET(request: Request) {
  const returnPath = safeReturnPath(new URL(request.url).searchParams.get('return'));

  const outcome = await refreshSessionAndSave();

  // Só 'dead' (refresh token expirado/rotacionado de verdade) destrói a sessão. Back fora
  // do ar ('unavailable' — deploy, cold start) NÃO pode custar a sessão do usuário: devolve
  // 503 sem tocar no cookie, e a próxima tentativa renova normalmente. Redirecionar de volta
  // pro returnPath aqui viraria loop (a página detectaria o access vencido e voltaria).
  if (outcome === 'dead') {
    const session = await getSession();
    session.destroy();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (outcome === 'unavailable') {
    return NextResponse.json(
      { message: 'Servidor temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503 },
    );
  }

  return NextResponse.redirect(new URL(returnPath, request.url));
}
