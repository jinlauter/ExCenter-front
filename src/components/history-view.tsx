'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUp, ArrowDown, ChevronDown, Check, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TrendChart } from '@/components/trend-chart';
import { isOutOfRange, parseReferenceRange } from '@/lib/reference-range';
import { computeHistoryAnalysis, type ParamSeries } from '@/lib/history-analysis';
import { cn } from '@/lib/utils';
import type { BloodTestResultQueryResponse } from '@/types/api';

// Máximo de gráficos lado a lado. Três é o limite em que a comparação ainda é comparação —
// acima disso a tela vira um mural e o usuário rola em vez de comparar.
const MAX_SELECTED_PARAMS = 3;

function formatDateLong(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Dropdown de seleção múltipla com teto de 3 — construído aqui (e não um <select multiple>)
// porque o nativo não tem teto de seleção nem visual consistente entre browsers, e o projeto
// não usa lib de componentes. Fecha com clique fora e Esc.
function ParamMultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: ParamSeries[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const atLimit = selected.length >= MAX_SELECTED_PARAMS;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const selectedLabels = selected
    .map((key) => options.find((o) => o.key === key)?.label)
    .filter(Boolean)
    .join(', ');

  return (
    <div ref={rootRef} className="relative max-w-[520px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className={cn('truncate text-left', !selectedLabels && 'text-muted-foreground')}>
          {selectedLabels || 'Selecionar parâmetros...'}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* O aviso do teto fica SEMPRE visível (não só dentro do painel): é ele que explica por
          que as opções desabilitam quando a 3ª é marcada. */}
      <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Selecione até {MAX_SELECTED_PARAMS} parâmetros para comparar — {selected.length} de {MAX_SELECTED_PARAMS} em uso.
      </p>

      {open && (
        <div className="absolute left-0 top-11 z-30 w-full rounded-md border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <Input
              placeholder="Filtrar parâmetros..."
              className="h-8"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-[260px] overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum parâmetro encontrado.</li>
            )}
            {filtered.map((option) => {
              const isSelected = selected.includes(option.key);
              const disabled = !isSelected && atLimit;
              return (
                <li key={option.key} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={disabled}
                    title={disabled ? `Máximo de ${MAX_SELECTED_PARAMS} parâmetros — desmarque um pra trocar.` : undefined}
                    onClick={() => onToggle(option.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors',
                      isSelected ? 'bg-primary-light/50 font-medium text-primary' : 'hover:bg-muted',
                      disabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {option.points.length} exames
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HistoryView({ results }: { results: BloodTestResultQueryResponse[] }) {
  const [selectedParams, setSelectedParams] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const analysis = useMemo(() => computeHistoryAnalysis(results), [results]);

  // Sem nada selecionado, o primeiro parâmetro entra sozinho — a tela nunca abre vazia, e
  // desmarcar tudo devolve o padrão em vez de deixar o vazio.
  //
  // Ajuste DURANTE a renderização, e não num efeito: o React reprocessa antes de pintar, então
  // ninguém vê o quadro intermediário sem seleção. O efeito pintava esse quadro e só depois
  // corrigia — a cascata que react-hooks/set-state-in-effect aponta.
  if (analysis.trendable.length && selectedParams.length === 0) {
    setSelectedParams([analysis.trendable[0]!.key]);
  }

  function toggleParam(key: string) {
    setSelectedParams((current) => {
      if (current.includes(key)) return current.filter((k) => k !== key);
      if (current.length >= MAX_SELECTED_PARAMS) return current;
      return [...current, key];
    });
  }

  // Na ordem em que o usuário selecionou — trocar a ordem dos gráficos embaixo dele seria
  // desorientador ("cadê o gráfico que eu acabei de abrir?").
  const selectedSeries = selectedParams
    .map((key) => analysis.trendable.find((s) => s.key === key))
    .filter((s): s is ParamSeries => Boolean(s));

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
      </div>

      {analysis.trendable.length > 0 ? (
        <Card className="mb-4 border-border">
          <CardContent className="p-6">
            <ParamMultiSelect
              options={analysis.trendable}
              selected={selectedParams}
              onToggle={toggleParam}
            />
            {/* Um gráfico POR seleção, empilhados na ordem de seleção. TrendChart é SVG de
                largura fixa responsiva — três empilhados continuam legíveis no mobile. */}
            <div className="mt-4 space-y-6">
              {selectedSeries.map((series) => {
                const referenceRange = parseReferenceRange(
                  series.points[series.points.length - 1]?.referenceValue,
                );
                return (
                  <div key={series.key}>
                    <h3 className="mb-2 text-sm font-medium">{series.label}</h3>
                    <TrendChart points={series.points} unit={series.unit} referenceRange={referenceRange} />
                  </div>
                );
              })}
            </div>
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

