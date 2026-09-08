import { CalendarClock, FileText } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ExamReportBody } from '@/components/exam-report-body';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExamDetailResponse } from '@/types/api';

// =============================================================================
// SharedExamView — a moldura do exame para quem chegou por um link
// =============================================================================
// A outra casca do mesmo documento (ver ExamReportBody). O que muda em relação à página
// autenticada é tudo que seria navegação: sem sidebar, sem "voltar", sem atalho pra nenhuma
// outra tela. Quem abre isto veio ver UM exame, não conhecer o produto — e um menu aqui só
// serviria pra levar a telas de login.
//
// A marca no topo continua, sem link: identifica de onde vem o documento (é o que dá confiança
// a quem recebeu um endereço por mensagem) sem virar isca de navegação.
//
// A única ação é o laudo original, e ela é DELIBERADAMENTE diferente dos três ícones discretos
// do detalhe: botão sólido com ícone e texto. Lá as ações competem entre si; aqui existe uma
// só, e quem recebeu o link precisa perceber na primeira olhada que pode conferir o documento
// do laboratório.
// =============================================================================

// Só a data, sem hora: o que a tarja precisa dizer é DESDE QUANDO o documento está congelado,
// e a hora só acrescentaria precisão que ninguém usa.
//
// O fuso vai fixo em São Paulo porque esta é uma página renderizada no SERVIDOR (Vercel roda em
// UTC): sem o fuso explícito, um exame compartilhado às 21h no Brasil apareceria como sendo do
// dia seguinte. O produto é pt-BR, então o fuso do país é a resposta certa — e é o mesmo motivo
// pelo qual as datas puras de exame são formatadas em UTC nas outras telas.
function formatarDataDoCompartilhamento(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

export function SharedExamView({
  exam,
  sharedAt,
  token,
}: {
  exam: ExamDetailResponse;
  sharedAt: string;
  token: string;
}) {
  const temLaudoOriginal = Boolean(exam.sourceFileId);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <BrandLogo size="md" withTagline />
          <h1 className="mt-3 text-2xl font-medium">Resultado do exame</h1>
        </div>

        {temLaudoOriginal && (
          <a
            href={`/api/compartilhado/${encodeURIComponent(token)}/laudo`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }), 'shrink-0')}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Ver o laudo original
          </a>
        )}
      </header>

      {/* A tarja de procedência, ANTES do documento. Quem recebe o link não tem como saber que
          está vendo uma fotografia: os resultados e o histórico de cada marcador foram montados
          no instante da publicação e não mudam mais. Sem este aviso, um exame enviado depois
          (que o titular vê na conta dele) simplesmente não estaria aqui, e a ausência pareceria
          erro do sistema — ou, pior, passaria despercebida por quem está avaliando o caso. */}
      <div className="flex gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-[13px] text-muted-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-medium text-foreground">
            Compartilhado em {formatarDataDoCompartilhamento(sharedAt)}.
          </span>{' '}
          Este documento é uma cópia congelada nessa data — exames enviados depois disso não
          aparecem aqui, nem no histórico de cada marcador.
        </p>
      </div>

      <ExamReportBody exam={exam} />

      <footer className="border-t border-border pt-4 text-center text-[13px] text-muted-foreground">
        <p>
          Documento compartilhado pelo titular do exame. O histórico de cada marcador foi montado
          pelo ExCenter a partir dos laudos enviados por ele.
        </p>
        <p className="mt-1">Não substitui avaliação médica.</p>
      </footer>
    </div>
  );
}
