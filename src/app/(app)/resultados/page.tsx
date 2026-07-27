import { backendFetchOrRedirect } from '@/lib/backend';
import { ExamResultsView } from '@/components/exam-results-view';
import type { ProcessedExamsPageResponse } from '@/types/api';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Página principal de resultados — mesma arquitetura de Exames enviados: a URL é a fonte de
// verdade da paginação (?page=&pageSize=), a view cliente só faz router.push dos params e
// este server component refaz a query no back. Valores inválidos caem nos defaults.
export default async function ExamResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1);
  const requestedSize = Number.parseInt(first(params.pageSize) ?? '', 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;

  const data = await backendFetchOrRedirect<ProcessedExamsPageResponse>(
    `/api/bloodtests/exams?page=${page}&pageSize=${pageSize}`,
  );

  return <ExamResultsView data={data} />;
}
