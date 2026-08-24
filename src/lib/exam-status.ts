// Rótulos e cores dos status de arquivo enviado — fonte ÚNICA para a tabela de Exames
// enviados e o card de resumo da home. Duplicar isso fazia o mesmo status aparecer com
// palavra ou cor diferente dependendo da tela.
//
// Cores no padrão dos tokens do tema (ver globals.css) — "retrying" e "processing" usam
// âmbar/azul do Tailwind, já que não há token semântico dedicado pra eles.

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  retrying: 'Tentando novamente',
  done: 'Concluído',
  failed: 'Falhou',
  // Laudo válido cujo exame o usuário JÁ tem (mesmo conteúdo em outro arquivo) — nada foi
  // importado. O back serializa o enum em minúsculas ("DuplicateExam" → "duplicateexam").
  duplicateexam: 'Laudo duplicado',
};

export const STATUS_CLASS: Record<string, string> = {
  pending: 'border-border bg-transparent text-muted-foreground',
  processing: 'border-blue-200 bg-blue-50 text-blue-700',
  retrying: 'border-amber-300 bg-amber-50 text-amber-700',
  done: 'border-success/30 bg-success/10 text-success',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
  // Âmbar como o "não é exame": informativo que merece atenção, não erro.
  duplicateexam: 'border-amber-300 bg-amber-50 text-amber-700',
};

/** Documento processado que a IA concluiu NÃO ser exame de sangue. */
export const NOT_EXAM_LABEL = 'Não é exame de sangue';
export const NOT_EXAM_CLASS = STATUS_CLASS.retrying!;
