import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackendError, backendFetchPublic } from '@/lib/backend';
import { SharedExamView } from '@/components/shared-exam-view';
import type { ExamDetailResponse } from '@/types/api';

// =============================================================================
// /resultados-compartilhados/{token} — o exame aberto por quem recebeu o link
// =============================================================================
// Sem sessão, sem menu, sem navegação. O token na URL é a credencial inteira; o back confere
// prazo e revogação e responde 404 igual para inexistente, vencido e revogado — aqui só se
// traduz isso em notFound().
//
// **O prefixo da rota importa e é frágil.** `/resultados` está em `PROTECTED_PREFIXES` no
// `proxy.ts`, e esta página SÓ escapa porque aquele teste é
// `pathname === p || pathname.startsWith(`${p}/`)`. Trocar por um `startsWith(p)` cru faria o
// visitante ser redirecionado pro login em silêncio. Há um teste em `src/__tests__` prendendo
// isso — se ele quebrar, é este recurso que está caindo.
//
// O `noindex` e o `no-referrer` vêm do layout do grupo `(publico)`, para nascerem aplicados em
// qualquer rota nova que entre aqui.
// =============================================================================

// Metadados NEUTROS, e isto não é descuido de copy: quando o link cair no WhatsApp, no Telegram
// ou no Slack, o robô de pré-visualização VAI buscar esta página. Se o título ou a descrição
// saíssem do exame, o cartão da conversa estamparia nome de paciente e resultado — para todo o
// grupo, antes de alguém sequer clicar.
export const metadata: Metadata = {
  title: 'Exame compartilhado',
  description: 'Um exame compartilhado por meio do ExCenter.',
  openGraph: {
    title: 'Exame compartilhado — ExCenter',
    description: 'Um exame compartilhado por meio do ExCenter.',
  },
};

export default async function SharedExamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let exam: ExamDetailResponse;
  try {
    exam = await backendFetchPublic<ExamDetailResponse>(
      `/api/public/shared-exams/${encodeURIComponent(token)}`,
    );
  } catch (err) {
    // 404 é o desfecho esperado de link inválido/vencido/revogado — as três causas chegam
    // iguais de propósito. Qualquer outro status é falha de verdade e sobe.
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err;
  }

  return <SharedExamView exam={exam} token={token} />;
}
