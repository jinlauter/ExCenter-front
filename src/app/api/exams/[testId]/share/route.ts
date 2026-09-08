import { NextResponse } from 'next/server';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { SITE_URL } from '@/lib/site';
import type { CreateExamShareResponse, ExamShareSummaryResponse } from '@/types/api';

// =============================================================================
// Link público de um exame — as três ações do TITULAR (Next BFF, autenticado)
// =============================================================================
// O back devolve o TOKEN, não a URL: ele não conhece o domínio do front. Quem monta o endereço
// é este arquivo, com o SITE_URL — e é aqui, também, que o token deixa de ser mencionado: da
// criação em diante só circula dentro da URL pronta.
// =============================================================================

/** Só o POST devolve isto, e uma vez só — o back guarda apenas o hash do token. */
interface CreateShareResult {
  url: string;
  expiresAt: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;

  let expiresInDays: number | undefined;
  try {
    const body = (await request.json()) as { expiresInDays?: number };
    expiresInDays = body?.expiresInDays;
  } catch {
    // Sem corpo = usa o padrão do sistema (4 dias). Não é erro.
  }

  try {
    const created = await backendFetch<CreateExamShareResponse>(
      `/api/bloodtests/exams/${testId}/share`,
      { method: 'POST', body: { expiresInDays } },
    );

    const result: CreateShareResult = {
      url: `${SITE_URL}/resultados-compartilhados/${created.token}`,
      expiresAt: created.expiresAt,
    };
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 'Não foi possível criar o link.');
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;

  try {
    // O resumo NÃO traz o token (ele não existe mais em claro), então também não traz URL. A UI
    // usa isto só pra saber que existe link vivo, até quando e quantas vezes foi aberto.
    const share = await backendFetch<ExamShareSummaryResponse>(
      `/api/bloodtests/exams/${testId}/share`,
    );
    return NextResponse.json(share);
  } catch (err) {
    // 404 aqui é resposta normal ("este exame não tem link"), não falha.
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json(null, { status: 404 });
    }
    return toErrorResponse(err, 'Não foi possível consultar o link.');
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;

  try {
    await backendFetch(`/api/bloodtests/exams/${testId}/share`, { method: 'DELETE' });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) {
      // Revogar o que já não existe é o desfecho que o usuário queria — não vale erro na tela.
      return new NextResponse(null, { status: 204 });
    }
    return toErrorResponse(err, 'Não foi possível revogar o link.');
  }
}

function toErrorResponse(err: unknown, fallback: string) {
  if (err instanceof UnauthenticatedError) {
    return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
  }
  if (err instanceof BackendError) {
    const body = err.body as { message?: string } | null;
    return NextResponse.json({ message: body?.message ?? fallback }, { status: err.status });
  }
  return NextResponse.json({ message: fallback }, { status: 502 });
}
