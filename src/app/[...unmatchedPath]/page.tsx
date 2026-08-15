import { notFound } from 'next/navigation';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { ReviewQueueView } from './review-queue-view';
import { UsersAdminView } from './users-admin-view';
import { createInviteAction, deleteUserAction, ignoreTermAction, mapTermAction, updateUserPlanAction } from './actions';
import type { ReviewQueuePage, UserAccountSummary } from './types';

// Este catch-all é DUAS coisas ao mesmo tempo, de propósito:
//
// 1. O 404 de toda URL não-mapeada do app.
// 2. A área camuflada do operador — que vive AQUI DENTRO, e não numa pasta própria, porque
//    assim todo caminho (secreto ou inventado) casa a MESMA rota e produz o MESMO payload; a
//    única diferença entre as respostas é o eco do caminho pedido, que qualquer resposta
//    carrega por natureza. Medido byte a byte no build de produção: uma pasta própria
//    denunciava o segmento no flight data do RSC, e o shell do notFound() diferia do 404 comum
//    em ~300 bytes — dois oráculos, os dois fechados por esta fusão. De quebra, o slug não
//    existe em manifesto de rotas nem em nome de chunk.
//
// A área tem duas abas (fila de revisão e usuários), navegadas por query string — âncora, não
// rota: rota nova seria caminho novo pra sondar.
//
// As outras decisões deliberadas (ver histórico no repo): sem verificação de operador no front
// (o back é a única autoridade — resposta que não é a área vira notFound()); sem loading.tsx
// (esqueleto piscando antes do 404 revelaria a página); sem redirect de login/refresh (redirect
// é confissão de existência — com sessão expirada esta página dá 404; abrir o app normal e
// voltar resolve).
export const dynamic = 'force-dynamic';

const OPERATOR_PATH_SEGMENT = 'zk7q';
const OPERATOR_BASE_PATH = `/${OPERATOR_PATH_SEGMENT}`;

export default async function UnmatchedOrHiddenPage({
  params,
  searchParams,
}: {
  params: Promise<{ unmatchedPath: string[] }>;
  searchParams: Promise<{ page?: string; aba?: string }>;
}) {
  const { unmatchedPath } = await params;

  const isOperatorPath =
    unmatchedPath.length === 1 && unmatchedPath[0] === OPERATOR_PATH_SEGMENT;
  if (!isOperatorPath) notFound();

  const { page: rawPage, aba } = await searchParams;
  const activeTab = aba === 'usuarios' ? 'usuarios' : 'fila';

  if (activeTab === 'usuarios') {
    const accounts = await fetchOrNotFound<UserAccountSummary[]>('/api/admin/users');
    return (
      <OperatorShell activeTab={activeTab}>
        <UsersAdminView
          accounts={accounts}
          createInvite={createInviteAction}
          deleteAccount={deleteUserAction}
          updatePlan={updateUserPlanAction}
        />
      </OperatorShell>
    );
  }

  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);
  const queuePage = await fetchOrNotFound<ReviewQueuePage>(
    `/api/admin/observed-terms/review-queue?page=${page}`,
  );
  return (
    <OperatorShell activeTab={activeTab}>
      <ReviewQueueView
        // key por página: navegação entre páginas REMONTA o estado local (cartões removidos,
        // feedbacks) — sem isso, o React preservaria o estado da página anterior sobre os
        // dados da nova.
        key={queuePage.page}
        queuePage={queuePage}
        basePath={OPERATOR_BASE_PATH}
        mapAction={mapTermAction}
        ignoreAction={ignoreTermAction}
      />
    </OperatorShell>
  );
}

// Busca do operador com as falhas que DEVEM virar 404 — e só elas — já traduzidas.
//
// Existe como função para que o try/catch envolva a BUSCA e não a RENDERIZAÇÃO: devolver JSX de
// dentro de um try faz o catch parecer que protege o render, coisa que ele não faz (erro de
// render é trabalho de error boundary). É o que a regra react-hooks/error-boundaries aponta.
async function fetchOrNotFound<T>(path: string): Promise<T> {
  try {
    return await backendFetch<T>(path, { skipRefresh: true });
  } catch (err) {
    if (err instanceof UnauthenticatedError) notFound();
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err; // 5xx real: melhor um erro visível pro operador que um 404 mentiroso
  }
}

function OperatorShell({ activeTab, children }: { activeTab: string; children: React.ReactNode }) {
  const tabClass = (tab: string) =>
    tab === activeTab
      ? 'border-b-2 border-primary px-3 py-2 text-sm font-semibold text-primary'
      : 'px-3 py-2 text-sm text-muted-foreground hover:text-foreground';

  return (
    <div className="mx-auto max-w-3xl p-4">
      <nav className="mb-4 flex gap-1 border-b border-border">
        <a href={OPERATOR_BASE_PATH} className={tabClass('fila')}>Fila de revisão</a>
        <a href={`${OPERATOR_BASE_PATH}?aba=usuarios`} className={tabClass('usuarios')}>Usuários</a>
      </nav>
      {children}
    </div>
  );
}
