import { NextResponse, type NextRequest } from 'next/server';

// =============================================================================
// Proxy de proteção de rotas (Edge runtime).
// =============================================================================
//
// É o antigo `middleware.ts`: o Next 16 renomeou a convenção para `proxy.ts` e passou a preferir
// o export `proxy` (o servidor resolve `mod.proxy || mod.middleware`). Só o nome mudou — a função
// e o `config.matcher` são os mesmos de sempre.
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

const PROTECTED_PREFIXES = ['/home', '/exames-enviados', '/resultados', '/configuracoes'];

// Rotas públicas que não fazem sentido para quem já entrou: a landing de vendas e as duas telas
// de acesso. Quem tem sessão é mandado pro /home antes de qualquer uma delas renderizar.
//
// A landing ('/') entrou nesta lista em 11/09/2026. O mesmo redirect vivia dentro do
// `app/page.tsx`, via `getSession()` — e ler sessão num server component torna a rota DINÂMICA:
// a raiz respondia `Cache-Control: no-store` e era renderizada de novo a cada visita, enquanto
// /para-medicos, que é estática, já vinha do CDN. Decidido aqui no edge, a landing volta a ser
// pré-renderizada.
//
// O que se perde: aqui só dá pra checar PRESENÇA do cookie (ver o bloco acima), então um cookie
// vencido leva ao /home e de lá é rebatido pro /login, em vez de mostrar a landing. É o mesmo
// comportamento que /login e /registrar já tinham desde sempre.
const ROUTES_REDIRECTED_WHEN_SIGNED_IN = ['/', '/login', '/registrar'];

export function proxy(request: NextRequest) {
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

  // Já autenticado tentando ver a landing ou o login → manda pra home.
  if (ROUTES_REDIRECTED_WHEN_SIGNED_IN.includes(pathname) && hasSession) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/home';
    return NextResponse.redirect(homeUrl);
  }

  // Propaga o pathname atual num header pra server components lerem (backendFetchOrRedirect usa
  // pra montar o return do /api/session/refresh). NextResponse.next() sem isso não expõe a rota
  // atual pro render.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Aplica em todas as rotas EXCETO as estáticas e as APIs (que cuidam da
  // própria validação) — assim economizamos execução no edge.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
