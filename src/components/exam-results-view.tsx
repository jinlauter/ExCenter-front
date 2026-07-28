'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  LineChart,
  RefreshCw,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDelayedFlag } from '@/lib/use-delayed-flag';
import { NavBanner } from '@/components/nav-banner';
import type { ProcessedExamListItem, ProcessedExamsPageResponse } from '@/types/api';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Mesmo corte da tela de Exames enviados: 22 caracteres com o nome completo no tooltip.
// Consistência entre telas E largura — sem isso a coluna do médico empurra "Ações" pra fora
// numa tela de notebook.
const DOCTOR_NAME_MAX_LENGTH = 22;

// Quantos exames/painéis aparecem direto na célula — o restante vai pro tooltip. Três é o
// máximo que cabe sem disputar largura com as outras colunas num laudo típico.
const INLINE_EXAM_NAMES = 3;
// Orçamento de caracteres da célula: nomes de exame brasileiros são compridos ("Hemograma
// com Contagem de Plaquetas", "Transaminase oxalacética - TGO...") e três deles quebravam a
// célula em 5-6 linhas, deixando as alturas da tabela desiguais. A regra vira: até 3 nomes,
// MAS só enquanto couberem no orçamento — senão 2, senão 1 (cortado, se nem sozinho couber).
const INLINE_CHAR_BUDGET = 52;
// Teto do tooltip: laudos grandes têm 15+ painéis; acima disso a lista vira poluição e a
// linha final "..." já comunica que existe mais.
const TOOLTIP_EXAM_NAMES = 10;

// Decide o que aparece inline: o maior prefixo (até 3 nomes) que cabe no orçamento, sempre
// mostrando ao menos 1 — nome gigante solitário é cortado no orçamento com reticências.
export function pickInlineExams(names: string[]): { inline: string; truncated: boolean } {
  if (names.length === 0) return { inline: '', truncated: false };

  let shown = 0;
  let joined = '';
  for (const name of names.slice(0, INLINE_EXAM_NAMES)) {
    const candidate = shown === 0 ? name : `${joined}, ${name}`;
    if (shown > 0 && candidate.length > INLINE_CHAR_BUDGET) break;
    joined = candidate;
    shown += 1;
  }

  if (joined.length > INLINE_CHAR_BUDGET) {
    return { inline: `${joined.slice(0, INLINE_CHAR_BUDGET)}...`, truncated: true };
  }
  return { inline: joined, truncated: shown < names.length };
}

function formatExamDate(value?: string | null) {
  if (!value) return null;
  // timeZone UTC pelo mesmo motivo da tela de Exames enviados: o valor é data pura em
  // meia-noite UTC, e converter pro fuso local faria a data "voltar um dia" no Brasil.
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// "—" com explicação: a informação vem da extração por IA e pode legitimamente não existir
// no laudo (ou não ter sido reconhecida). Tratamento aprovado no planejamento da tela.
function MissingValue({ label }: { label: string }) {
  return (
    <Tooltip content={`Não foi possível extrair ${label} deste exame.`}>
      <span className="cursor-help text-muted-foreground">—</span>
    </Tooltip>
  );
}

// Célula "Exames incluídos": 2-3 nomes direto, "..." quando há mais, e o tooltip (à direita,
// pra não morrer no overflow da grid) lista até 10 — um por linha, com "..." final se o laudo
// tiver mais que isso. O gatilho do hover é a célula inteira (texto + ícone), como combinado.
function IncludedExamsCell({ names }: { names: string[] }) {
  if (names.length === 0) return <MissingValue label="os exames" />;

  const { inline, truncated } = pickInlineExams(names);

  // whitespace-nowrap é o que garante alturas de linha uniformes na tabela — o orçamento de
  // caracteres já assegurou que o conteúdo cabe sem quebrar.
  if (!truncated) return <span className="whitespace-nowrap">{inline}</span>;

  const tooltipContent = (
    <>
      {names.slice(0, TOOLTIP_EXAM_NAMES).map((name) => (
        <span key={name} className="block">
          {name}
        </span>
      ))}
      {names.length > TOOLTIP_EXAM_NAMES && <span className="block">...</span>}
    </>
  );

  return (
    <Tooltip content={tooltipContent} placement="right">
      <span className="inline-flex cursor-help items-center gap-1.5 whitespace-nowrap">
        <span>{inline.endsWith('...') ? inline : `${inline}...`}</span>
        <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </span>
    </Tooltip>
  );
}

function AbnormalBadge({ exam }: { exam: ProcessedExamListItem }) {
  if (exam.resultCount === 0) return <MissingValue label="os resultados" />;

  if (exam.abnormalCount > 0) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        {exam.abnormalCount} {exam.abnormalCount === 1 ? 'alterado' : 'alterados'}
      </span>
    );
  }

  return (
    <span className="inline-block whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      Sem alterações
    </span>
  );
}

interface ExamResultsViewProps {
  data: ProcessedExamsPageResponse;
}

// Tela principal de resultados — a visão do MÉDICO: "o exame que eu pedi, o que deu?".
// Deliberadamente sem nome de arquivo (isso é detalhe de upload, vive em Exames enviados)
// e só com o que processou com sucesso. Paginação server-side na URL, como Exames enviados.
export function ExamResultsView({ data }: ExamResultsViewProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const isGridLoading = useDelayedFlag(isNavigating || isRefreshing);

  function pushParams(next: Partial<{ page: number; pageSize: number }>) {
    const merged = { page: data.page, pageSize: data.pageSize, ...next };
    const qs = new URLSearchParams();
    if (merged.page > 1) qs.set('page', String(merged.page));
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) qs.set('pageSize', String(merged.pageSize));
    const query = qs.toString();
    startNavigation(() => router.push(query ? `/resultados?${query}` : '/resultados'));
  }

  function openExam(testId: string) {
    startNavigation(() => router.push(`/resultados/${testId}`));
  }

  const rangeStart = (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min((data.page - 1) * data.pageSize + data.items.length, data.totalCount);

  return (
    <div>
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium">Resultado de exames</h1>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Veja o resultado de cada exame que você enviou, do jeito que o médico pediu.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Atualizar"
          disabled={isRefreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Mesmo padrão visual do atalho de upload em Exames enviados — é o "outro modo" da
          tela: em vez de exame a exame, a evolução de todos os parâmetros cruzando laudos. */}
      <NavBanner
        href="/resultados/geral"
        icon={LineChart}
        title="Visualizar histórico geral"
        description="A evolução dos seus parâmetros ao longo do tempo, cruzando todos os exames enviados."
      />

      {data.totalCount === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-base font-medium">Nenhum exame processado ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Assim que um exame de sangue for enviado e processado, o resultado dele aparece aqui.
          </p>
          <Link href="/home" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Clique aqui para enviar exames
          </Link>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-lg border border-border bg-card">
            {isGridLoading && (
              <>
                <div className="pointer-events-none absolute inset-0 z-10 bg-foreground/10" aria-hidden="true" />
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary-light"
                  role="status"
                  aria-label="Atualizando a lista"
                >
                  <div className="h-full w-1/4 bg-primary motion-safe:animate-[grid-loading-bar_1.1s_ease-in-out_infinite]" />
                </div>
              </>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium">Data do exame</th>
                    <th className="px-4 py-3 text-left font-medium">Médico solicitante</th>
                    <th className="px-4 py-3 text-left font-medium">Laboratório</th>
                    <th className="px-4 py-3 text-left font-medium">Exames incluídos</th>
                    <th className="px-4 py-3 text-left font-medium">Alterados</th>
                    <th className="px-4 py-3 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((exam) => (
                    // Linha inteira clicável (abrir é a ÚNICA ação da tela, sem ambiguidade) +
                    // olhinho no fim pra manter o padrão de Exames enviados. O hover pinta a
                    // linha com o verde-claro da marca e acende o olhinho — affordance dupla
                    // de que a linha navega.
                    <tr
                      key={exam.testId}
                      onClick={() => openExam(exam.testId)}
                      className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-primary-light/30"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                        {formatExamDate(exam.examDate) ?? <MissingValue label="a data" />}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {exam.requestingDoctor ? (
                          exam.requestingDoctor.length > DOCTOR_NAME_MAX_LENGTH ? (
                            <Tooltip content={exam.requestingDoctor}>
                              <span className="cursor-help">
                                {`${exam.requestingDoctor.slice(0, DOCTOR_NAME_MAX_LENGTH)}...`}
                              </span>
                            </Tooltip>
                          ) : (
                            exam.requestingDoctor
                          )
                        ) : (
                          <MissingValue label="o médico solicitante" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {exam.laboratoryName ?? <MissingValue label="o laboratório" />}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <IncludedExamsCell names={exam.includedExams} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <AbnormalBadge exam={exam} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center">
                          <Link
                            href={`/resultados/${exam.testId}`}
                            title="Ver resultado do exame"
                            aria-label="Ver resultado do exame"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              buttonVariants({ variant: 'ghost', size: 'icon' }),
                              'h-8 w-8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground',
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Mostrando {rangeStart}–{rangeEnd} de {data.totalCount}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Por página
                <Select
                  className="h-8 w-[72px]"
                  value={String(data.pageSize)}
                  onChange={(e) => pushParams({ pageSize: Number(e.target.value), page: 1 })}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Página anterior"
                  disabled={data.page <= 1 || isNavigating}
                  onClick={() => pushParams({ page: data.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[90px] text-center">
                  Página {data.page} de {Math.max(data.totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Próxima página"
                  disabled={data.page >= data.totalPages || isNavigating}
                  onClick={() => pushParams({ page: data.page + 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
