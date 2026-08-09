'use client';

import { useState } from 'react';
import { ChevronDown, LineChart } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { Card } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { TrendChart } from '@/components/trend-chart';
import { parseReferenceRange } from '@/lib/reference-range';
import { cn } from '@/lib/utils';
import type { ExamDetailGroup, ExamDetailResponse, ExamDetailResult } from '@/types/api';

// =============================================================================
// ExamDetailView — o "nosso laudo"
// =============================================================================
// Template inspirado na anatomia do laudo impresso brasileiro: cabeçalho com data de
// coleta/médico/laboratório, painéis na ordem do documento com "(Material: X) (Método: Y)",
// linhas Exame | Resultado | Valor de Referência — e, como os próprios laboratórios fazem,
// um "Gráfico de Histórico" por parâmetro. A diferença: o histórico deles usa só a base do
// próprio lab; o nosso cruza todos os exames que o usuário já enviou.
// =============================================================================

function formatExamDate(value?: string | null) {
  if (!value) return null;
  // timeZone UTC: valor é data pura em meia-noite UTC; fuso local faria "voltar um dia".
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function MissingValue({ label }: { label: string }) {
  return (
    <Tooltip content={`Não foi possível extrair ${label} deste exame.`}>
      <span className="cursor-help text-muted-foreground">—</span>
    </Tooltip>
  );
}

function formatResultValue(result: ExamDetailResult) {
  if (result.numericResultValue != null) {
    // O valor foi extraído do laudo como texto e parseado — re-renderizar em pt-BR mantém a
    // cara do documento original (14,6 e não 14.6).
    const num = result.numericResultValue.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    return result.unit ? `${num} ${result.unit}` : num;
  }
  return result.stringResultValue ?? null;
}

// Uma linha do laudo. O gráfico de histórico fica retraído por padrão — laudo grande tem 60+
// parâmetros e abrir tudo viraria uma parede de gráficos; o botão só existe quando há 2+
// pontos (1 ponto não é evolução, é o próprio valor já exibido na linha).
function ResultRow({ result, showName }: { result: ExamDetailResult; showName: boolean }) {
  const [chartOpen, setChartOpen] = useState(false);
  const hasHistory = result.history.length >= 2;
  const value = formatResultValue(result);

  return (
    <div className="border-t border-border py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          {showName && <p className="text-[13px] font-medium">{result.parameterName}</p>}
          {result.referenceValue && (
            <p className="text-[11px] text-muted-foreground">Referência: {result.referenceValue}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {result.isAbnormal === true && (
            <span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Fora da faixa
            </span>
          )}
          <span
            className={cn(
              'min-w-[70px] text-right text-sm font-semibold',
              result.isAbnormal === true && 'text-amber-700',
            )}
          >
            {value ?? <MissingValue label="o resultado" />}
          </span>
          {hasHistory ? (
            <button
              type="button"
              onClick={() => setChartOpen((v) => !v)}
              aria-expanded={chartOpen}
              className={cn(
                'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                chartOpen
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-primary hover:bg-primary-light/40',
              )}
            >
              <LineChart className="h-3.5 w-3.5" />
              Histórico
              <ChevronDown className={cn('h-3 w-3 transition-transform', chartOpen && 'rotate-180')} />
            </button>
          ) : (
            // Espaçador do mesmo tamanho do botão: sem ele, os valores das linhas COM e SEM
            // histórico desalinham na vertical.
            <span className="w-[86px]" aria-hidden="true" />
          )}
        </div>
      </div>

      {chartOpen && hasHistory && (
        <div className="mt-3 rounded-lg bg-muted/30 p-3">
          <TrendChart
            points={result.history.map((p) => ({
              date: new Date(p.date),
              value: p.value,
              referenceValue: p.referenceValue,
              laboratoryName: p.laboratoryName,
              requestingDoctor: p.requestingDoctor,
            }))}
            unit={result.unit}
            referenceRange={parseReferenceRange(result.referenceValue)}
          />
        </div>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: ExamDetailGroup }) {
  const materialMethod = [
    group.material ? `Material: ${group.material}` : null,
    group.method ? `Método: ${group.method}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Card className="border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-[13px] font-semibold">{group.name}</h2>
        {materialMethod && <p className="text-[11px] text-muted-foreground">{materialMethod}</p>}
      </div>
      <div className="mt-1">
        {group.results.map((result) => (
          // Exame avulso: o nome já é o título do card — repetir na linha seria eco.
          <ResultRow key={result.resultId} result={result} showName={!group.isSingle} />
        ))}
      </div>
    </Card>
  );
}

export function ExamDetailView({ exam }: { exam: ExamDetailResponse }) {
  const date = formatExamDate(exam.examDate);

  return (
    <div className="space-y-4">
      <header>
        <BackLink href="/resultados" label="Voltar para Resultado de exames" />
        <h1 className="text-2xl font-medium">Resultado do exame</h1>
      </header>

      {/* Cabeçalho do laudo: os mesmos dados que o documento impresso traz no topo. */}
      <Card className="border-border p-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Data do exame</p>
            <p className="font-medium">{date ?? <MissingValue label="a data" />}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Médico solicitante</p>
            <p className="font-medium">{exam.requestingDoctor ?? <MissingValue label="o médico solicitante" />}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Laboratório</p>
            <p className="font-medium">{exam.laboratoryName ?? <MissingValue label="o laboratório" />}</p>
          </div>
          <div className="ml-auto self-center">
            {exam.abnormalCount > 0 ? (
              <span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {exam.abnormalCount} de {exam.resultCount} fora da faixa
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                Sem alterações
              </span>
            )}
          </div>
        </div>
      </Card>

      {exam.groups.map((group) => (
        <GroupCard key={group.name} group={group} />
      ))}
    </div>
  );
}
