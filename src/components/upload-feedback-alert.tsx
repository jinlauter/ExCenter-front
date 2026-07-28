'use client';

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// =============================================================================
// UploadFeedbackAlert — o desfecho de um envio de exames
// =============================================================================
// Três desfechos, não dois. Antes, "enviou tudo" e "enviou parte porque o resto era duplicata"
// caíam no MESMO alerta verde, e o aviso da duplicata era a última sentença de um parágrafo
// que o usuário já tinha lido como "deu certo" — passava batido. Agora envio com duplicata é
// âmbar, o que NÃO entrou vira título, e os arquivos barrados são listados pelo nome.
// =============================================================================

export interface UploadFeedback {
  type: 'success' | 'warning' | 'error';
  /** Manchete do desfecho. Só nos casos com duplicata: no sucesso limpo não há o que destacar. */
  title?: string;
  message: string;
  /** Listados sob a mensagem, para o usuário saber QUAL arquivo ficou de fora. */
  duplicateFileNames?: string[];
  /** Só quando algo entrou na fila: sem isso, "Ver agora" promete novidade que não existe. */
  showSentListLink?: boolean;
}

function pluralizeFiles(count: number) {
  return count === 1 ? '1 arquivo' : `${count} arquivos`;
}

/**
 * Traduz a resposta do upload nos três desfechos possíveis. O back detecta duplicata pelo hash
 * do conteúdo e nunca reprocessa o arquivo — aqui só damos nome ao que aconteceu.
 */
export function buildUploadFeedback(fileCount: number, duplicateFileNames: string[]): UploadFeedback {
  const duplicateCount = duplicateFileNames.length;

  if (duplicateCount === 0) {
    return {
      type: 'success',
      message: `${pluralizeFiles(fileCount)} enviado${fileCount === 1 ? '' : 's'}. O processamento ocorre em segundo plano — acompanhe em "Exames enviados".`,
      showSentListLink: true,
    };
  }

  // Nada entrou na fila: sem "Ver agora", que apontaria pra uma lista sem novidade nenhuma.
  if (fileCount === 0) {
    return {
      type: 'warning',
      title: 'Nenhum arquivo foi enviado',
      message:
        duplicateCount === 1
          ? 'Esse arquivo já havia sido enviado e processado anteriormente:'
          : 'Todos os arquivos selecionados já haviam sido enviados e processados anteriormente:',
      duplicateFileNames,
    };
  }

  return {
    type: 'warning',
    title: `${pluralizeFiles(duplicateCount)} não ${duplicateCount === 1 ? 'foi enviado' : 'foram enviados'}`,
    message: `${pluralizeFiles(fileCount)} de ${fileCount + duplicateCount} ${fileCount === 1 ? 'foi enviado' : 'foram enviados'} e ${fileCount === 1 ? 'está sendo processado' : 'estão sendo processados'}. Já ${duplicateCount === 1 ? 'havia sido enviado antes' : 'haviam sido enviados antes'}:`,
    duplicateFileNames,
    showSentListLink: true,
  };
}

// Ícone por desfecho: diferenciação que NÃO depende de cor. Verde e âmbar são justamente um par
// que embaralha em deuteranopia — sem o ícone, a diferença entre "deu tudo certo" e "foi, mas
// não tudo" seria apenas o tom do fundo.
const FEEDBACK_ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export function UploadFeedbackAlert({
  feedback,
  isOpeningSentList = false,
  onOpenSentList,
}: {
  feedback: UploadFeedback;
  // Opcionais: só o desfecho de um envio oferece "Ver agora". Erro de validação da seleção
  // (antes de qualquer envio) usa este mesmo alerta sem link nenhum.
  isOpeningSentList?: boolean;
  onOpenSentList?: () => void;
}) {
  const Icon = FEEDBACK_ICON[feedback.type];

  return (
    // 'error' mapeia pra 'destructive' — o resto tem variante de mesmo nome no Alert.
    <Alert variant={feedback.type === 'error' ? 'destructive' : feedback.type}>
      {/* Filho DIRETO do Alert de propósito: alertVariants posiciona `[&>svg]` absoluto no canto
          e afasta os irmãos com pl-7. Envolver o ícone numa div quebraria os dois. */}
      <Icon className="h-4 w-4" aria-hidden="true" />
      {feedback.title && <AlertTitle>{feedback.title}</AlertTitle>}
      <AlertDescription>
        {feedback.message}

        {feedback.duplicateFileNames && feedback.duplicateFileNames.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {feedback.duplicateFileNames.map((name) => (
              // break-all: nome de laudo baixado de portal costuma ser uma string longa e sem
              // espaço — sem isso ele estoura a largura do alerta no mobile.
              <li key={name} className="break-all font-medium">
                {name}
              </li>
            ))}
          </ul>
        )}

        {feedback.showSentListLink && onOpenSentList && (
          <p className="mt-1">
            {/* Botão com estado, não <Link> puro: a página de destino é renderizada no servidor
                (consulta o back) e leva 1-2s — sem o spinner, o clique parecia ter falhado e o
                usuário clicava de novo achando que errou. */}
            <button
              type="button"
              disabled={isOpeningSentList}
              onClick={onOpenSentList}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-70"
            >
              {isOpeningSentList && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isOpeningSentList ? 'Abrindo...' : 'Ver agora'}
            </button>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
