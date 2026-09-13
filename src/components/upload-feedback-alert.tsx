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

/** Um grupo de arquivos que ficou de fora, com o motivo na etiqueta. */
export interface ExcludedFiles {
  label: string;
  names: string[];
}

export interface UploadFeedback {
  type: 'success' | 'warning' | 'error';
  /** Manchete do desfecho. Só quando algo ficou de fora: no sucesso limpo não há o que destacar. */
  title?: string;
  message: string;
  /**
   * Os arquivos barrados, AGRUPADOS POR MOTIVO — e não numa lista só, porque o que o usuário
   * faz a respeito é diferente: duplicata já está no sistema e não há o que fazer; fora da cota
   * volta a caber no mês seguinte, ou com outro plano.
   */
  excluded?: ExcludedFiles[];
  /** Só quando algo entrou na fila: sem isso, "Ver agora" promete novidade que não existe. */
  showSentListLink?: boolean;
}

function pluralizeFiles(count: number) {
  return count === 1 ? '1 arquivo' : `${count} arquivos`;
}

function groupsOf(duplicateFileNames: string[], overQuotaFileNames: string[]): ExcludedFiles[] {
  const groups: ExcludedFiles[] = [];

  if (duplicateFileNames.length > 0) {
    groups.push({
      label: duplicateFileNames.length === 1 ? 'Já enviado antes:' : 'Já enviados antes:',
      names: duplicateFileNames,
    });
  }

  // Etiqueta sem prazo ("volta mês que vem") de propósito: o teto do Grátis é vitalício e o do
  // Pessoal é mensal, e o front não sabe qual é o da conta. Prometer renovação aqui seria
  // mentira pra metade dos planos.
  if (overQuotaFileNames.length > 0) {
    groups.push({
      label: 'Fora do limite de envios do seu plano:',
      names: overQuotaFileNames,
    });
  }

  return groups;
}

/**
 * Traduz a resposta do upload nos três desfechos possíveis. Um arquivo fica de fora por dois
 * motivos independentes, que podem acontecer no MESMO envio: já ter sido enviado antes (o back
 * detecta pelo hash do conteúdo) ou não caber no teto de envios do plano.
 */
export function buildUploadFeedback(
  fileCount: number,
  duplicateFileNames: string[],
  overQuotaFileNames: string[] = [],
): UploadFeedback {
  const excluded = groupsOf(duplicateFileNames, overQuotaFileNames);
  const excludedCount = duplicateFileNames.length + overQuotaFileNames.length;

  if (excludedCount === 0) {
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
        excludedCount === 1
          ? 'O arquivo selecionado não entrou na fila:'
          : 'Nenhum dos arquivos selecionados entrou na fila:',
      excluded,
    };
  }

  return {
    type: 'warning',
    title: `${pluralizeFiles(excludedCount)} não ${excludedCount === 1 ? 'foi enviado' : 'foram enviados'}`,
    message: `${pluralizeFiles(fileCount)} de ${fileCount + excludedCount} ${fileCount === 1 ? 'foi enviado' : 'foram enviados'} e ${fileCount === 1 ? 'está sendo processado' : 'estão sendo processados'}.`,
    excluded,
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

        {feedback.excluded?.map((group) => (
          <div key={group.label} className="mt-1.5">
            {/* A etiqueta do motivo repete em cada grupo em vez de virar uma frase só na
                mensagem: com dois motivos no mesmo envio, "estes ficaram de fora" seguido de
                uma lista misturada não diz ao usuário o que fazer com cada arquivo. */}
            <p>{group.label}</p>
            <ul className="mt-0.5 space-y-0.5">
              {group.names.map((name) => (
                // break-all: nome de laudo baixado de portal costuma ser uma string longa e sem
                // espaço — sem isso ele estoura a largura do alerta no mobile.
                <li key={name} className="break-all font-medium">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ))}

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
