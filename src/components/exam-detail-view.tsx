'use client';

import { useState } from 'react';
import { Download, Eye, FileLineChart, Share2 } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { ExamReportBody } from '@/components/exam-report-body';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { usePlan } from '@/components/plan-context';
import { ShareExamDialog } from '@/components/share-exam-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExamDetailResponse } from '@/types/api';

// =============================================================================
// ExamDetailView — a MOLDURA do laudo na área autenticada
// =============================================================================
// Navegação de volta, título e as ações do documento. O laudo em si vive em
// ExamReportBody, compartilhado com a página pública de exame compartilhado — ver o
// comentário de lá sobre por que os dois são cascas em volta do mesmo documento.
// =============================================================================


// Ações do laudo, no topo e à direita do título — o canto onde o usuário procura o que "fazer
// com este documento", e o mesmo idioma visual da tela de exames enviados (ghost + ícone).
//
// Ver/baixar o original só existem quando o exame nasceu de um arquivo (sourceFileId presente);
// exame criado via /analyze não tem laudo pra mostrar — botão desabilitado com o motivo no
// tooltip. Desabilitado declarado é honesto; botão que aceita o clique e não faz nada não é.
function ExamActions({
  testId,
  sourceFileId,
  sourceFileName,
  onPreviewOriginal,
  onShare,
}: {
  testId: string;
  sourceFileId?: string | null;
  sourceFileName?: string | null;
  onPreviewOriginal: () => void;
  onShare: () => void;
}) {
  const hasOriginal = Boolean(sourceFileId);
  const disabledReason = 'Este exame não tem arquivo original guardado.';

  // UX apenas: a recusa de verdade é o 403 do back em ?forExport=true, que a própria página de
  // impressão trata. Isto só evita abrir uma aba nova pra mostrar uma negativa.
  const { canExportExamPdf } = usePlan();

  return (
    <div className="flex items-center gap-1">
      <Tooltip content={hasOriginal ? 'Ver o exame original' : disabledReason}>
        <button
          type="button"
          disabled={!hasOriginal}
          onClick={onPreviewOriginal}
          aria-label="Ver o exame original"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'h-9 w-9',
            hasOriginal ? 'text-primary' : 'cursor-not-allowed text-muted-foreground',
          )}
        >
          <Eye className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content={hasOriginal ? 'Baixar o laudo original, como o laboratório enviou' : disabledReason}>
        {hasOriginal ? (
          <a
            href={`/api/bloodtests/files/${sourceFileId}/download`}
            download={sourceFileName ?? undefined}
            aria-label="Baixar o laudo original"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-9 w-9 text-primary')}
          >
            <Download className="h-4 w-4" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Baixar o laudo original"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'h-9 w-9 cursor-not-allowed text-muted-foreground',
            )}
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </Tooltip>

      {/* Documento COM gráfico: separa visualmente o "arquivo do laboratório" do "documento que o
          ExCenter monta". Abre em aba nova — a rota de impressão chama o diálogo sozinha e a
          página do exame continua onde estava. */}
      <Tooltip
        content={
          canExportExamPdf
            ? 'Baixar este exame com o seu histórico ExCenter em PDF, pronto pra levar ao médico'
            : 'Exportar o laudo do ExCenter em PDF está disponível a partir do plano Pessoal.'
        }
      >
        {canExportExamPdf ? (
          <a
            href={`/resultados/${testId}/imprimir`}
            target="_blank"
            rel="noopener"
            aria-label="Baixar o exame com o histórico ExCenter"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-9 w-9 text-primary')}
          >
            <FileLineChart className="h-4 w-4" />
          </a>
        ) : (
          // Desabilitado declarado, mesmo tratamento do exame sem arquivo original logo acima:
          // o botão continua visível com o motivo no hover. Escondê-lo faria a funcionalidade
          // simplesmente não existir pra quem está no Grátis, e ninguém assina o que não viu.
          <button
            type="button"
            disabled
            aria-label="Baixar o exame com o histórico ExCenter"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'h-9 w-9 cursor-not-allowed text-muted-foreground',
            )}
          >
            <FileLineChart className="h-4 w-4" />
          </button>
        )}
      </Tooltip>

      {/* Compartilhar fica por ÚLTIMO e visualmente separado: as três ações anteriores mexem
          com arquivos que só o dono vê; esta publica o exame pra fora. Agrupar tudo no mesmo
          bloco convidaria ao clique distraído. */}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <Tooltip content="Criar um link para mostrar este exame a alguém sem conta no ExCenter">
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartilhar este exame por link"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-9 w-9 text-primary')}
        >
          <Share2 className="h-4 w-4" />
        </button>
      </Tooltip>
    </div>
  );
}

export function ExamDetailView({ exam }: { exam: ExamDetailResponse }) {
  const [previewingOriginal, setPreviewingOriginal] = useState(false);
  const [sharing, setSharing] = useState(false);

  return (
    <div className="space-y-4">
      <header>
        <BackLink href="/resultados" label="Voltar para Resultado de exames" />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-medium">Resultado do exame</h1>
          <ExamActions
            testId={exam.testId}
            sourceFileId={exam.sourceFileId}
            sourceFileName={exam.sourceFileName}
            onPreviewOriginal={() => setPreviewingOriginal(true)}
            onShare={() => setSharing(true)}
          />
        </div>
      </header>

      {previewingOriginal && exam.sourceFileId && (
        <FilePreviewModal
          fileId={exam.sourceFileId}
          fileName={exam.sourceFileName ?? 'laudo'}
          onClose={() => setPreviewingOriginal(false)}
        />
      )}

      {sharing && <ShareExamDialog testId={exam.testId} onClose={() => setSharing(false)} />}

      <ExamReportBody exam={exam} />
    </div>
  );
}
