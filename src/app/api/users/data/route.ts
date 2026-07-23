import { NextResponse } from 'next/server';
import { backendFetch, UnauthenticatedError } from '@/lib/backend';

// =============================================================================
// DELETE /api/users/data (Next BFF)
// =============================================================================
// Repassa DELETE /api/users/me/data do back: apaga IRREVERSIVELMENTE todos os
// arquivos e exames do usuário autenticado (storage + tabelas). A confirmação
// de intenção acontece na UI (ClearDataSection) — aqui já é definitivo.
// =============================================================================

export async function DELETE() {
  try {
    await backendFetch<void>('/api/users/me/data', { method: 'DELETE' });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    return NextResponse.json(
      { message: 'Não foi possível limpar seus dados. Tente novamente.' },
      { status: 502 },
    );
  }
}
