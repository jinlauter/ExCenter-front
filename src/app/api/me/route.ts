import { NextResponse } from 'next/server';
import { backendFetch, UnauthenticatedError } from '@/lib/backend';
import type { MeResponse } from '@/types/api';

// =============================================================================
// GET /api/me (Next BFF)
// =============================================================================
// Repassa GET /api/auth/me do back. Útil pra client components que precisam
// de dados frescos do usuário (server components usam getSession() direto).
// =============================================================================

export async function GET() {
  try {
    const data = await backendFetch<MeResponse>('/api/auth/me', { method: 'GET' });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Erro ao consultar usuário.' }, { status: 502 });
  }
}
