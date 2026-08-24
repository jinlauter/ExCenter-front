'use client';

import { useEffect, useState, useTransition } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, CreditCard, EyeOff, List, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ReviewActionResult, ReviewQueueCandidate, ReviewQueueEntry, ReviewQueuePage } from './types';

interface ReviewQueueViewProps {
  queuePage: ReviewQueuePage;
  basePath: string;
  mapAction: (termId: number, canonicalAnalyteId: number) => Promise<ReviewActionResult>;
  ignoreAction: (termId: number) => Promise<ReviewActionResult>;
}

type ReviewViewMode = 'card' | 'list';

// A preferência sobrevive entre visitas: revisar fila é tarefa recorrente, e reescolher o modo
// a cada sessão seria atrito puro.
const viewModeStorageKey = 'excenter.review-queue.view-mode';

// A tela inteira existe para UMA pergunta por cartão: "a cascata parou aqui — o que você
// decide?". O modo CARTÃO (default, decisão do dono em 23/08) mostra uma pendência por vez em
// tela cheia e avança sozinho quando ela é decidida — o ritmo de quem está esvaziando a fila.
// O modo LISTA é a exibição original, boa pra varrer o conjunto. O conteúdo de cada pendência
// é IDÊNTICO nos dois modos: motivo da parada em português claro, escolhas da IA marcadas, e
// cada candidato com o contexto completo (código LOINC, classe, rank, perfis).
export function ReviewQueueView({ queuePage, basePath, mapAction, ignoreAction }: ReviewQueueViewProps) {
  const [entries, setEntries] = useState(queuePage.entries);
  const [decidedCount, setDecidedCount] = useState(0);
  const [feedbackByTermId, setFeedbackByTermId] = useState<Record<number, string>>({});
  const [confirmingIgnoreOf, setConfirmingIgnoreOf] = useState<ReviewQueueEntry | null>(null);
  const [manualAnalyteIdByTermId, setManualAnalyteIdByTermId] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<ReviewViewMode>('card');
  const [cardIndex, setCardIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  // localStorage só existe no cliente — ler no efeito evita divergência de hidratação; o
  // default 'card' pisca pra 'list' só pra quem escolheu lista, uma vez, aceitável.
  useEffect(() => {
    if (window.localStorage.getItem(viewModeStorageKey) === 'list') setViewMode('list');
  }, []);

  function switchViewMode(mode: ReviewViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(viewModeStorageKey, mode);
  }

  const totalPages = Math.max(1, Math.ceil(queuePage.totalPendingCount / queuePage.pageSize));
  const pendingNow = Math.max(0, queuePage.totalPendingCount - decidedCount);

  // O avanço automático do modo cartão é isto: decidir REMOVE a entrada, e o clamp faz a
  // próxima ocupar o mesmo índice — sem gerência de estado extra.
  const safeCardIndex = Math.min(cardIndex, Math.max(0, entries.length - 1));
  const cardEntry = entries[safeCardIndex];

  function runAction(termId: number, action: () => Promise<ReviewActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setEntries((current) => current.filter((entry) => entry.termId !== termId));
        setDecidedCount((count) => count + 1);
        setFeedbackByTermId((current) => ({ ...current, [termId]: '' }));
      } else {
        setFeedbackByTermId((current) => ({
          ...current,
          [termId]: result.message ?? 'Não foi possível concluir a ação.',
        }));
      }
    });
  }

  function renderEntry(entry: ReviewQueueEntry) {
    return (
      <EntryDecisionCard
        key={entry.termId}
        entry={entry}
        isPending={isPending}
        feedback={feedbackByTermId[entry.termId]}
        manualAnalyteId={manualAnalyteIdByTermId[entry.termId] ?? ''}
        onManualAnalyteIdChange={(value) =>
          setManualAnalyteIdByTermId((current) => ({ ...current, [entry.termId]: value }))
        }
        onMap={(canonicalAnalyteId) =>
          runAction(entry.termId, () => mapAction(entry.termId, canonicalAnalyteId))
        }
        onRequestIgnore={() => setConfirmingIgnoreOf(entry)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Fila de revisão do dicionário</h1>
          <p className="text-sm text-muted-foreground">
            {pendingNow === 0
              ? 'Nada pendente — a cascata está dando conta sozinha.'
              : `${pendingNow} termo(s) esperando a sua decisão, mais observados primeiro.`}
          </p>
        </div>

        <div role="group" aria-label="Modo de exibição" className="flex rounded-md border border-border text-xs">
          <button
            type="button"
            aria-pressed={viewMode === 'card'}
            onClick={() => switchViewMode('card')}
            className={`flex items-center gap-1 rounded-l-md px-2.5 py-1.5 font-medium ${
              viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> Cartão
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'list'}
            onClick={() => switchViewMode('list')}
            className={`flex items-center gap-1 rounded-r-md px-2.5 py-1.5 font-medium ${
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </header>

      {viewMode === 'card' && entries.length > 0 && cardEntry && (
        <>
          <nav className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={safeCardIndex === 0}
              onClick={() => setCardIndex(safeCardIndex - 1)}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-muted-foreground">
              {safeCardIndex + 1} de {entries.length} nesta página
            </span>
            <button
              type="button"
              disabled={safeCardIndex >= entries.length - 1}
              onClick={() => setCardIndex(safeCardIndex + 1)}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-40"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          </nav>

          {renderEntry(cardEntry)}
        </>
      )}

      {viewMode === 'list' && entries.map(renderEntry)}

      {isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Gravando decisão…
        </p>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-border pt-3 text-sm">
          {queuePage.page > 1 ? (
            <a href={`${basePath}?page=${queuePage.page - 1}`} className="flex items-center gap-1 hover:underline">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </a>
          ) : <span />}
          <span className="text-muted-foreground">
            Página {queuePage.page} de {totalPages}
          </span>
          {queuePage.page < totalPages ? (
            <a href={`${basePath}?page=${queuePage.page + 1}`} className="flex items-center gap-1 hover:underline">
              Próxima <ChevronRight className="h-4 w-4" />
            </a>
          ) : <span />}
        </nav>
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

interface EntryDecisionCardProps {
  entry: ReviewQueueEntry;
  isPending: boolean;
  feedback: string | undefined;
  manualAnalyteId: string;
  onManualAnalyteIdChange: (value: string) => void;
  onMap: (canonicalAnalyteId: number) => void;
  onRequestIgnore: () => void;
}

// O conteúdo de UMA pendência, idêntico nos dois modos — extraído para os modos não poderem
// divergir no que mostram.
function EntryDecisionCard({
  entry, isPending, feedback, manualAnalyteId, onManualAnalyteIdChange, onMap, onRequestIgnore,
}: EntryDecisionCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
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
                  {candidate.loincName} · {candidate.loincPartCode}
                  {candidate.propertyClass && ` · classe ${candidate.propertyClass}`}
                  {candidate.commonTestRank != null && ` · rank ${candidate.commonTestRank}`}
                  {` · id ${candidate.canonicalAnalyteId} · ${candidate.position}º na busca`}
                </p>
                {candidate.materialProfiles.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">
                    perfis: {formatProfiles(candidate)}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onMap(candidate.canonicalAnalyteId)}
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
          value={manualAnalyteId}
          onChange={(event) => onManualAnalyteIdChange(event.target.value)}
          className="w-44 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={isPending || !manualAnalyteId}
          onClick={() => onMap(Number(manualAnalyteId))}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
          Mapear por id
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onRequestIgnore}
          className="ml-auto rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <EyeOff className="mr-1 inline h-3.5 w-3.5" />
          Não é analito
        </button>
      </div>

      {feedback && <p className="mt-2 text-sm text-destructive">{feedback}</p>}
    </article>
  );
}

function ContextChip({ label }: { label: string }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{label}</span>;
}

function formatProfiles(candidate: ReviewQueueCandidate): string {
  return candidate.materialProfiles
    .map((profile) =>
      profile.exampleUcumUnits.length > 0
        ? `${profile.material} (${profile.exampleUcumUnits.join(', ')})`
        : profile.material)
    .join(' · ');
}

// O tradutor dos portões: cada combinação vira UMA frase que diz por que a cascata não decidiu.
// A ordem dos casos segue a ordem da própria cascata. No veto de unidade, a frase inclui o que
// o perfil ACEITA — a informação que faltava para decidir em segundos.
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
    const chosen = entry.candidatesOffered.find(
      (candidate) => candidate.canonicalAnalyteId === entry.firstPassChosenAnalyteId,
    );
    const accepted = chosen ? formatProfiles(chosen) : '';
    return 'A IA escolheu o mesmo analito nas duas passadas, mas a unidade do laudo não aparece no perfil dele.'
      + (accepted ? ` O perfil aceita: ${accepted}.` : '');
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
