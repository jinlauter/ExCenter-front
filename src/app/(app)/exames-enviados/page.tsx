import { backendFetchOrRedirect } from '@/lib/backend';
import { SentExamsView } from '@/components/sent-exams-view';
import type { SentFilesPageResponse } from '@/types/api';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

// A URL é a fonte de verdade de página/ordenação/busca (?page=&pageSize=&sortBy=&sortDir=&q=):
// a view cliente só faz router.push dos params, este server component refaz a query no back.
// Valores inválidos na URL (editável à mão) caem nos defaults em vez de quebrar a página.
export default async function SentExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1);
  const requestedSize = Number.parseInt(first(params.pageSize) ?? '', 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;
  const sortBy = first(params.sortBy) ?? 'examDate';
  const sortDir = first(params.sortDir) === 'asc' ? 'asc' : 'desc';
  const search = first(params.q)?.trim() ?? '';

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortDir,
  });
  if (search) query.set('search', search);

  const data = await backendFetchOrRedirect<SentFilesPageResponse>(`/api/bloodtests/files?${query}`);

  return <SentExamsView data={data} sortBy={sortBy} sortDir={sortDir} search={search} />;
}
