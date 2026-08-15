import { notFound } from 'next/navigation';
import { BackendError, backendFetchOrRedirect } from '@/lib/backend';
import { LaudoPrintView } from '@/components/laudo-print-view';
import type { ExamDetailResponse } from '@/types/api';

// O laudo ExCenter pronto pra virar PDF — mesma chamada do detalhe (/resultados/[testId]),
// renderizada no template de impressão. 404 do back (inclusive exame de OUTRO usuário, que o
// back mascara igual) vira notFound.
export default async function LaudoPrintPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;

  let exam: ExamDetailResponse;
  try {
    exam = await backendFetchOrRedirect<ExamDetailResponse>(`/api/bloodtests/exams/${testId}`);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err;
  }

  return <LaudoPrintView exam={exam} />;
}
