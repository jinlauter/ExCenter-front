import { notFound } from 'next/navigation';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { ReviewQueueView } from './review-queue-view';
import { ignoreTermAction, mapTermAction } from './actions';
import type { ReviewQueuePage } from './types';

// Este catch-all é DUAS coisas ao mesmo tempo, de propósito:
//
// 1. O 404 de toda URL não-mapeada do app.
// 2. A rota camuflada da fila de revisão do operador — que vive AQUI DENTRO, e não numa pasta
//    própria, porque assim todo caminho (secreto ou inventado) casa a MESMA rota e produz o
//    MESMO payload; a única diferença entre as respostas é o eco do caminho pedido, que
//    qualquer resposta carrega por natureza. Medido byte a byte no build de produção: uma
//    pasta própria denunciava o segmento no flight data do RSC, e o shell do notFound()
//    diferia do 404 comum em ~300 bytes — dois oráculos, os dois fechados por esta fusão.
//    De quebra, o slug não existe em manifesto de rotas nem em nome de chunk.
//
// As outras decisões deliberadas (ver histórico no repo): sem verificação de operador no front
// (o back é a única autoridade — resposta que não é a fila vira notFound()); sem loading.tsx
// (esqueleto piscando antes do 404 revelaria a página); sem redirect de login/refresh (redirect
// é confissão de existência — com sessão expirada esta página dá 404; abrir o app normal e
// voltar resolve).
export const dynamic = 'force-dynamic';

const OPERATOR_REVIEW_PATH_SEGMENT = 'zk7q';

export default async function UnmatchedOrHiddenPage({
  params,
  searchParams,
}: {
  params: Promise<{ unmatchedPath: string[] }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { unmatchedPath } = await params;

  const isOperatorReviewPath =
    unmatchedPath.length === 1 && unmatchedPath[0] === OPERATOR_REVIEW_PATH_SEGMENT;
  if (!isOperatorReviewPath) notFound();

  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);

  let queuePage: ReviewQueuePage;

  try {
    queuePage = await backendFetch<ReviewQueuePage>(
      `/api/admin/observed-terms/review-queue?page=${page}`,
      { skipRefresh: true },
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) notFound();
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err; // 5xx real: melhor um erro visível pro operador que um 404 mentiroso
  }

  return (
    <ReviewQueueView
      // key por página: navegação entre páginas REMONTA o estado local (cartões removidos,
      // feedbacks) — sem isso, o React preservaria o estado da página anterior sobre os
      // dados da nova.
      key={queuePage.page}
      queuePage={queuePage}
      basePath={`/${OPERATOR_REVIEW_PATH_SEGMENT}`}
      mapAction={mapTermAction}
      ignoreAction={ignoreTermAction}
    />
  );
}
