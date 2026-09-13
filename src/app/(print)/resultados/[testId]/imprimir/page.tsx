import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackendError, backendFetchOrRedirect } from '@/lib/backend';
import { LaudoPrintView } from '@/components/laudo-print-view';
import type { ExamDetailResponse } from '@/types/api';

// O laudo ExCenter pronto pra virar PDF — mesma chamada do detalhe (/resultados/[testId]),
// renderizada no template de impressão. 404 do back (inclusive exame de OUTRO usuário, que o
// back mascara igual) vira notFound.
//
// `forExport=true` é o que transforma esta leitura em EXPORTAÇÃO aos olhos do back, que a
// recusa com 403 quando o plano não inclui exportar o laudo. A flag é confiável porque esta
// página é server component: quem chama o back é o servidor do Next, não o browser — não há
// como tirar a flag do caminho pela URL.
export default async function LaudoPrintPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;

  let exam: ExamDetailResponse;
  try {
    exam = await backendFetchOrRedirect<ExamDetailResponse>(
      `/api/bloodtests/exams/${testId}?forExport=true`,
    );
  } catch (err) {
    if (err instanceof BackendError && err.status === 403) return <ExportNaoIncluidaNoPlano />;
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err;
  }

  return <LaudoPrintView exam={exam} />;
}

// A página de impressão chama o diálogo de impressão sozinha assim que carrega. Aqui NÃO: quem
// caiu neste caminho não tem o que imprimir, e abrir o diálogo por cima de uma mensagem de
// upgrade seria só ruído. Daí ser um bloco próprio, e não o laudo com um aviso em cima.
function ExportNaoIncluidaNoPlano() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">O laudo em PDF é dos planos pagos</h1>
      <p className="text-muted-foreground">
        Exportar o laudo do ExCenter em PDF está disponível a partir do plano Pessoal. Seu exame
        continua aqui, e o arquivo original do laboratório segue disponível para download.
      </p>
      <Link href="/resultados" className="text-primary underline-offset-4 hover:underline">
        Voltar aos meus exames
      </Link>
    </main>
  );
}
