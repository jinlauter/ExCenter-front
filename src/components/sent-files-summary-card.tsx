import { FileText } from 'lucide-react';
import { STATUS_CLASS, STATUS_LABEL, NOT_EXAM_CLASS, NOT_EXAM_LABEL } from '@/lib/exam-status';
import type { SentFilesSummaryResponse } from '@/types/api';

// Card de resumo da home. Fala em ARQUIVOS, não exames: nem todo arquivo enviado vira exame
// — a IA pode concluir que o documento não é exame de sangue, e o processamento pode falhar.
// Chamar tudo de "exame" fazia o número não bater com a tela de resultados.
//
// A quebra por status usa os MESMOS rótulos e cores da tabela de Exames enviados (ver
// lib/exam-status) — o usuário reconhece o mesmo estado nas duas telas.

// Ordem de exibição: o que ainda precisa de atenção primeiro, resolvido por último — mesma
// lógica da ordenação padrão da tabela de enviados.
function buildBreakdown(summary: SentFilesSummaryResponse) {
  return [
    { key: 'pending', count: summary.pending, label: STATUS_LABEL.pending!, className: STATUS_CLASS.pending! },
    { key: 'processing', count: summary.processing, label: STATUS_LABEL.processing!, className: STATUS_CLASS.processing! },
    { key: 'retrying', count: summary.retrying, label: STATUS_LABEL.retrying!, className: STATUS_CLASS.retrying! },
    { key: 'failed', count: summary.failed, label: STATUS_LABEL.failed!, className: STATUS_CLASS.failed! },
    { key: 'notExam', count: summary.notExam, label: NOT_EXAM_LABEL, className: NOT_EXAM_CLASS },
    { key: 'done', count: summary.done, label: STATUS_LABEL.done!, className: STATUS_CLASS.done! },
    // Status zerado não vira badge: uma fileira de zeros é ruído, e a ausência já comunica
    // "não tem nenhum nesse estado".
  ].filter((item) => item.count > 0);
}

export function SentFilesSummaryCard({ summary }: { summary: SentFilesSummaryResponse }) {
  const breakdown = buildBreakdown(summary);

  return (
    <div className="mb-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.75} />
        <div>
          <p className="text-[22px] font-semibold leading-none">{summary.total}</p>
          <p className="text-xs text-muted-foreground">
            {summary.total === 1 ? 'Arquivo enviado' : 'Arquivos enviados'}
          </p>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {breakdown.map((item) => (
            <span
              key={item.key}
              className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${item.className}`}
            >
              {item.count} {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
