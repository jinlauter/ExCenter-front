import { NextResponse } from 'next/server';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// =============================================================================
// DELETE /api/bloodtests/files/{fileId} (Next BFF)
// =============================================================================
// Repassa a exclusão definitiva de um arquivo enviado: apaga o exame e os
// resultados extraídos dele, o registro do arquivo e o objeto no storage. A
// confirmação de intenção acontece na UI (ConfirmDialog) — aqui já é definitivo.
//
// O 409 do back tem significado próprio e precisa chegar inteiro no cliente: o
// worker está com o arquivo, então a exclusão é recusada e o usuário tem que
// tentar de novo depois. Traduzir isso pra um erro genérico deixaria a mensagem
// sem sentido ("não foi possível excluir" não diz o que fazer a respeito).
// =============================================================================

export async function DELETE(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  const { fileId } = await params;

  try {
    await backendFetch<void>(`/api/bloodtests/files/${fileId}`, { method: 'DELETE' });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }

    if (err instanceof BackendError && (err.status === 404 || err.status === 409)) {
      const message =
        typeof err.body === 'object' && err.body !== null && 'message' in err.body
          ? String((err.body as { message: unknown }).message)
          : 'Não foi possível excluir o arquivo.';
      return NextResponse.json({ message }, { status: err.status });
    }

    return NextResponse.json(
      { message: 'Não foi possível excluir o arquivo. Tente novamente.' },
      { status: 502 },
    );
  }
}
