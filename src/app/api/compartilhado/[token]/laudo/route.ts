import { NextResponse } from 'next/server';
import { backendFetchPublicRaw } from '@/lib/backend';

// =============================================================================
// GET /api/compartilhado/{token}/laudo (Next BFF, SEM sessão)
// =============================================================================
// O laudo original de um exame compartilhado. Existe pelo mesmo motivo do proxy autenticado
// ao lado: `BACKEND_URL` é server-only e o browser nunca fala com o .NET direto — nem aqui,
// onde não há credencial a proteger, porque expor o endereço do back é entregar superfície
// de graça.
//
// A diferença crítica para o irmão autenticado: este NÃO usa `backendFetchRaw`. Aquele injeta
// Bearer, tenta refresh em 401 e destrói a sessão quando o refresh falha — num visitante que
// por acaso TAMBÉM é usuário do ExCenter, isso derrubaria a sessão dele por causa de um link
// que não tem nada a ver com a conta.
//
// Quem autoriza é o token; quem confere prazo e revogação é o back. Aqui só se repassa o
// stream, sem bufferizar o PDF inteiro na memória do BFF.
// =============================================================================

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const response = await backendFetchPublicRaw(
      `/api/public/shared-exams/${encodeURIComponent(token)}/file`,
    );

    if (!response.ok) {
      // Mesma mensagem para inexistente, vencido e revogado — o back já uniformiza, e repetir
      // a regra aqui evita que uma futura "melhoria de mensagem" reabra a distinção.
      return NextResponse.json({ message: 'Link não encontrado ou expirado.' }, { status: 404 });
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');
    if (contentType) headers.set('content-type', contentType);
    if (contentDisposition) headers.set('content-disposition', contentDisposition);

    // Repetidos aqui e não só herdados do back: esta resposta é a que o browser realmente vê,
    // e é ela que um CDN na frente do front guardaria. Exame de sangue não pode ser indexado
    // nem ficar em cache compartilhado depois que o link vence.
    headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
    headers.set('cache-control', 'no-store, private');

    return new NextResponse(response.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ message: 'Não foi possível abrir o laudo.' }, { status: 502 });
  }
}
