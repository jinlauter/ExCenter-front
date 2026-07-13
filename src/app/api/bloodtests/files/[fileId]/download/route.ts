import { NextResponse } from 'next/server';
import { backendFetchRaw, UnauthenticatedError } from '@/lib/backend';

// =============================================================================
// GET /api/bloodtests/files/{fileId}/download (Next BFF)
// =============================================================================
// Proxy autenticado: o .NET exige Authorization: Bearer, que o browser não
// consegue enviar numa navegação simples (<a href>). Aqui o Next injeta o
// Bearer server-side (via backendFetchRaw) e repassa o arquivo (com o mesmo
// Content-Type / Content-Disposition) pro browser, que já chega autenticado
// via cookie de sessão.
// =============================================================================

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  try {
    const response = await backendFetchRaw(`/api/bloodtests/files/${fileId}/download`, {
      method: 'GET',
    });

    if (!response.ok) {
      return NextResponse.json({ message: 'Arquivo não encontrado.' }, { status: response.status });
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');
    if (contentType) headers.set('content-type', contentType);
    if (contentDisposition) headers.set('content-disposition', contentDisposition);

    return new NextResponse(response.body, { status: 200, headers });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Não foi possível baixar o arquivo.' }, { status: 502 });
  }
}
