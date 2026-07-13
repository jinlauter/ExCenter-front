import { NextResponse } from 'next/server';
import { logoutAndClearSession } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// =============================================================================
// POST /api/logout (Next BFF)
// =============================================================================
// Limpa o cookie de sessão do Next e tenta invalidar a sessão no .NET.
// Idempotente — sempre devolve 204 mesmo se o back já tinha invalidado.
// =============================================================================

export async function POST() {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  await logoutAndClearSession();
  return new NextResponse(null, { status: 204 });
}
