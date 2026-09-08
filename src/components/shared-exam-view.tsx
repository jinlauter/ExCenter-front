import { FileText } from 'lucide-react';
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

export function SharedExamView({ exam, token }: { exam: ExamDetailResponse; token: string }) {
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
