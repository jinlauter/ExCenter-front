'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, EyeOff, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ReviewActionResult, ReviewQueueCandidate, ReviewQueueEntry } from './types';

interface ReviewQueueViewProps {
  initialEntries: ReviewQueueEntry[];
  mapAction: (termId: number, canonicalAnalyteId: number) => Promise<ReviewActionResult>;
  ignoreAction: (termId: number) => Promise<ReviewActionResult>;
}

// A tela inteira existe para UMA pergunta por cartão: "a cascata parou aqui — o que você
// decide?". Por isso o motivo da parada vem em português claro no topo de cada cartão, e as
// escolhas da IA ficam marcadas nos candidatos: a pessoa CONFERE um raciocínio, não reconstrói.
export function ReviewQueueView({ initialEntries, mapAction, ignoreAction }: ReviewQueueViewProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [feedbackByTermId, setFeedbackByTermId] = useState<Record<number, string>>({});
  const [confirmingIgnoreOf, setConfirmingIgnoreOf] = useState<ReviewQueueEntry | null>(null);
  const [manualAnalyteIdByTermId, setManualAnalyteIdByTermId] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();

  function runAction(termId: number, action: () => Promise<ReviewActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setEntries((current) => current.filter((entry) => entry.termId !== termId));
        setFeedbackByTermId((current) => ({ ...current, [termId]: '' }));
      } else {
        setFeedbackByTermId((current) => ({
          ...current,
          [termId]: result.message ?? 'Não foi possível concluir a ação.',
        }));
      }
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <h1 className="text-xl font-semibold">Fila de revisão do dicionário</h1>
        <p className="text-sm text-muted-foreground">
          {entries.length === 0
            ? 'Nada pendente — a cascata está dando conta sozinha.'
            : `${entries.length} termo(s) esperando a sua decisão, mais observados primeiro.`}
        </p>
      </header>

      {entries.map((entry) => (
        <article key={entry.termId} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">{entry.sampleOriginalName}</h2>
            <span className="text-xs text-muted-foreground">visto {entry.timesObserved}×</span>
          </div>

          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            {entry.sampleOriginalUnit && <ContextChip label={`unidade: ${entry.sampleOriginalUnit}`} />}
            {entry.sampleMaterial && <ContextChip label={`material: ${entry.sampleMaterial}`} />}
            {entry.samplePanelName && <ContextChip label={`painel: ${entry.samplePanelName}`} />}
            {entry.sampleLaboratoryName && <ContextChip label={entry.sampleLaboratoryName} />}
          </div>

          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">{stopReasonInPlainWords(entry)}</p>

          {entry.candidatesOffered.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {entry.candidatesOffered.map((candidate) => (
                <li
                  key={candidate.canonicalAnalyteId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {candidate.bestDisplayName}
                      {aiChoiceBadge(entry, candidate)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {candidate.loincName} · id {candidate.canonicalAnalyteId} · {candidate.position}º na busca
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(entry.termId, () => mapAction(entry.termId, candidate.canonicalAnalyteId))}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    Mapear
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Mapear para outro id…"
              value={manualAnalyteIdByTermId[entry.termId] ?? ''}
              onChange={(event) =>
                setManualAnalyteIdByTermId((current) => ({ ...current, [entry.termId]: event.target.value }))
              }
              className="w-44 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={isPending || !manualAnalyteIdByTermId[entry.termId]}
              onClick={() =>
                runAction(entry.termId, () =>
                  mapAction(entry.termId, Number(manualAnalyteIdByTermId[entry.termId])))
              }
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
              Mapear por id
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmingIgnoreOf(entry)}
              className="ml-auto rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <EyeOff className="mr-1 inline h-3.5 w-3.5" />
              Não é analito
            </button>
          </div>

          {feedbackByTermId[entry.termId] && (
            <p className="mt-2 text-sm text-destructive">{feedbackByTermId[entry.termId]}</p>
          )}
        </article>
      ))}

      {isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Gravando decisão…
        </p>
      )}

      {confirmingIgnoreOf && (
        <ConfirmDialog
          title="Marcar como não-analito?"
          description="O termo sai da fila e nunca será mapeado. Use para cabeçalhos e artefatos de transcrição — não para exames que o dicionário ainda não cobre."
          highlight={confirmingIgnoreOf.sampleOriginalName}
          confirmLabel="Ignorar termo"
          onConfirm={() => {
            const termId = confirmingIgnoreOf.termId;
            setConfirmingIgnoreOf(null);
            runAction(termId, () => ignoreAction(termId));
          }}
          onCancel={() => setConfirmingIgnoreOf(null)}
        />
      )}
    </main>
  );
}

function ContextChip({ label }: { label: string }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{label}</span>;
}

// O tradutor dos portões: cada combinação vira UMA frase que diz por que a cascata não decidiu.
// A ordem dos casos segue a ordem da própria cascata.
function stopReasonInPlainWords(entry: ReviewQueueEntry): string {
  if (entry.status === 'NoCandidateFound') {
    return 'A busca não trouxe nenhum candidato — provável exame que o dicionário não cobre. Você pode mapear por id, ou marcar como não-analito.';
  }
  if (entry.firstPassChosenAnalyteId === null) {
    return 'A IA olhou os candidatos e respondeu que nenhum corresponde a este termo.';
  }
  if (entry.stabilityGatePassed === false) {
    return 'As duas passadas da IA escolheram analitos diferentes — a escolha não é estável o bastante para valer sozinha.';
  }
  if (entry.unitGatePassed === false) {
    return 'A IA escolheu o mesmo analito nas duas passadas, mas a unidade do laudo não aparece no perfil dele.';
  }
  if (entry.materialGatePassed === false) {
    return 'A IA escolheu o mesmo analito nas duas passadas, mas o material do laudo não bate com os perfis dele.';
  }
  return 'A cascata não teve confiança suficiente para decidir sozinha.';
}

function aiChoiceBadge(entry: ReviewQueueEntry, candidate: ReviewQueueCandidate): string {
  const first = entry.firstPassChosenAnalyteId === candidate.canonicalAnalyteId;
  const second = entry.secondPassChosenAnalyteId === candidate.canonicalAnalyteId;
  if (first && second) return ' · escolha da IA (2×)';
  if (first) return ' · escolha da 1ª passada';
  if (second) return ' · escolha da 2ª passada';
  return '';
}
