import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// =============================================================================
// GET /api/session (Next BFF)
// =============================================================================
// Indica se há sessão ativa, devolvendo dados públicos (username, userId).
// NÃO devolve tokens. Útil para client components decidirem hidratação.
// =============================================================================

export async function GET() {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({
    authenticated: true,
    username: session.username,
    userId: session.userId ?? null,
  });
}
