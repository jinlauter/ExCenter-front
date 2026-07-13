import { NextResponse, type NextRequest } from 'next/server';

// =============================================================================
// Middleware de proteção de rotas (Edge runtime).
// =============================================================================
//
// Rodamos no Edge — não dá pra descriptografar iron-session aqui (precisa de
// Node + crypto Web API com Buffer). Por isso a checagem é só de PRESENÇA do
// cookie. A validação real (sessão expirada, tokens inválidos) acontece nas
// route handlers / server components quando tentam usar a sessão.
//
// O cookie name é hardcoded aqui porque process.env.SESSION_COOKIE_NAME
// não funciona em Edge sem build-time inlining. Se mudar em .env.local,
// atualizar aqui também (e a constante DEFAULT_COOKIE_NAME).
// =============================================================================

const DEFAULT_COOKIE_NAME = 'excenter-session';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? DEFAULT_COOKIE_NAME;

const PROTECTED_PREFIXES = ['/home', '/exames-enviados', '/historico'];
const AUTH_ROUTES = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(COOKIE_NAME);

  // Rota protegida sem sessão → manda pro login preservando o destino.
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Já autenticado tentando ver /login → manda pra home.
  if (AUTH_ROUTES.includes(pathname) && hasSession) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/home';
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica em todas as rotas EXCETO as estáticas e as APIs (que cuidam da
  // própria validação) — assim economizamos execução no edge.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
