'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TrendChart } from '@/components/trend-chart';
import { isOutOfRange, parseReferenceRange } from '@/lib/reference-range';
import { computeHistoryAnalysis } from '@/lib/history-analysis';
import type { BloodTestResultQueryResponse } from '@/types/api';

function formatDateLong(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function HistoryView({ results }: { results: BloodTestResultQueryResponse[] }) {
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const analysis = useMemo(() => computeHistoryAnalysis(results), [results]);

  useEffect(() => {
    if (analysis.trendable.length && !selectedParam) {
      setSelectedParam(analysis.trendable[0]!.key);
    }
  }, [analysis, selectedParam]);

  const selectedSeries = analysis.trendable.find((s) => s.key === selectedParam);
  const selectedReferenceRange = selectedSeries
    ? parseReferenceRange(selectedSeries.points[selectedSeries.points.length - 1]?.referenceValue)
    : null;

  const filteredGroups = [...analysis.groups.entries()]
    .map(([groupName, items]) => [
      groupName,
      items.filter((r) => r.parameterName.toLowerCase().includes(search.trim().toLowerCase())),
    ] as const)
    .filter(([, items]) => items.length > 0);

  if (!analysis.latestExam) {
    return (
      <Card className="border-border p-10 text-center">
        <h2 className="mb-1 text-base font-medium">Nenhum exame processado ainda</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Assim que um exame de sangue for enviado e processado, seus resultados aparecem aqui.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Card className="min-w-[160px] border-border p-4">
          <p className="text-[22px] font-semibold leading-none">{analysis.examsSorted.length}</p>
          <p className="text-xs text-muted-foreground">Exames processados</p>
        </Card>
        <Card className="min-w-[220px] border-border p-4">
          <p className="text-sm font-semibold leading-tight">
            {analysis.examsSorted.length > 1
              ? `${formatDateLong(analysis.examsSorted[0]!.date)} — ${formatDateLong(analysis.examsSorted[analysis.examsSorted.length - 1]!.date)}`
              : formatDateLong(analysis.examsSorted[0]!.date)}
          </p>
          <p className="text-xs text-muted-foreground">Período coberto</p>
        </Card>
        {analysis.laboratories.length > 0 && (
          <Card className="min-w-[200px] border-border p-4">
            <p className="text-sm font-semibold leading-tight">{analysis.laboratories.join(', ')}</p>
            <p className="text-xs text-muted-foreground">Laboratório(s)</p>
          </Card>
        )}
      </div>

      {analysis.trendable.length > 0 ? (
        <Card className="mb-4 border-border">
          <CardContent className="p-6">
            <Select
              className="mb-4 max-w-[380px]"
              value={selectedParam ?? ''}
              onChange={(e) => setSelectedParam(e.target.value)}
            >
              {analysis.trendable.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
            {selectedSeries && (
              <TrendChart points={selectedSeries.points} unit={selectedSeries.unit} referenceRange={selectedReferenceRange} />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4 border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Envie mais exames com parâmetros em comum pra ver gráficos de evolução aqui.
          </p>
        </Card>
      )}

      <h2 className="mb-3 text-base font-medium">Último exame ({formatDateLong(analysis.latestExam.date)})</h2>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome do parâmetro..."
          className="bg-card pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredGroups.map(([groupName, items]) => (
        <details key={groupName} open className="group mb-2 rounded-lg border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-semibold">
            {groupName}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-2">
            {items.map((r, i) => {
              const outOfRange = isOutOfRange(r.numericResultValue, r.referenceValue);
              return (
                <div
                  key={r.resultId}
                  className={`flex items-center justify-between gap-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{r.parameterName}</p>
                    {r.referenceValue && (
                      <p className="text-[11px] text-muted-foreground">Ref: {r.referenceValue}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.delta != null && Math.abs(r.delta) > 0.001 && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        {r.delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        <span className="text-[11px]">
                          {Math.abs(r.delta) < 10 ? Math.abs(r.delta).toFixed(2) : Math.abs(r.delta).toFixed(0)}
                        </span>
                      </span>
                    )}
                    {outOfRange && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Fora da faixa
                      </span>
                    )}
                    <span className="min-w-[70px] text-right text-sm font-semibold">
                      {r.numericResultValue ?? r.stringResultValue ?? '—'}
                      {r.numericResultValue != null && r.unit ? ` ${r.unit}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </>
  );
}
