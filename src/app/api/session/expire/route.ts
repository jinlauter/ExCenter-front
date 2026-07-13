import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// =============================================================================
// GET /api/session/expire (Next BFF)
// =============================================================================
// Destino de redirect quando um server component detecta sessão inválida
// (backendFetchOrRedirect). Só um Route Handler pode de fato apagar o cookie
// — redirecionar direto pra /login a partir de um server component deixaria
// o cookie (inválido) intacto, e o middleware (que só checa PRESENÇA do
// cookie, não validade) mandaria de volta pra /home → loop de redirect.
// Esta rota quebra o loop: apaga o cookie de verdade e só então redireciona.
// =============================================================================

export async function GET(request: Request) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL('/login', request.url));
}
