import { notFound } from 'next/navigation';
import { BackendError, backendFetchOrRedirect } from '@/lib/backend';
import { ExamDetailView } from '@/components/exam-detail-view';
import type { ExamDetailResponse } from '@/types/api';

// Detalhe de um exame processado — o template estilo laudo. O back devolve a página inteira
// numa chamada (cabeçalho + painéis + série histórica por parâmetro); aqui só se traduz 404
// em notFound() — testId vem da URL e pode ser qualquer coisa, inclusive exame de OUTRO
// usuário (o back valida a posse e devolve 404 igual, sem diferenciar).
export default async function ExamDetailPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;

  let exam: ExamDetailResponse;
  try {
    exam = await backendFetchOrRedirect<ExamDetailResponse>(`/api/bloodtests/exams/${testId}`);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err;
  }

  return <ExamDetailView exam={exam} />;
}
