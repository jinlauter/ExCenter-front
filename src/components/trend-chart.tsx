'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReferenceRange } from '@/lib/reference-range';
import { isOutOfRange } from '@/lib/reference-range';
import { computeTrend } from '@/lib/trend';

const WIDTH = 680;
const HEIGHT = 260;
const MARGIN = { top: 20, right: 56, bottom: 32, left: 44 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const PRIMARY = 'hsl(var(--primary))';
const PRIMARY_DARK = 'hsl(var(--primary-dark))';
const BORDER = 'hsl(var(--border))';
const DESTRUCTIVE = 'hsl(var(--destructive))';

export interface TrendPoint {
  date: Date;
  value: number;
  referenceValue?: string | null;
  // Procedência para o tooltip: onde foi medido e quem pediu o exame deste ponto.
  laboratoryName?: string | null;
  requestingDoctor?: string | null;
}

// Formata a tendência (cálculo em @/lib/trend) para o badge: seta + texto, neutro. Sem base
// para % (anterior = 0), cai na variação absoluta. Estável mostra "estável vs. anterior".
const ARROW_BY_DIRECTION = { up: '↑', down: '↓', flat: '→' } as const;

function trendBadge(points: TrendPoint[]): { arrow: string; text: string } | null {
  const trend = computeTrend(points.map((p) => p.value));
  if (!trend) return null;
  const arrow = ARROW_BY_DIRECTION[trend.direction];
  if (trend.direction === 'flat') return { arrow, text: 'estável vs. anterior' };
  if (trend.percent === null) {
    const sign = trend.absoluteChange > 0 ? '+' : '';
    return { arrow, text: `${sign}${formatValue(trend.absoluteChange)} vs. anterior` };
  }
  const magnitude = Math.abs(trend.percent);
  const rounded = magnitude >= 10 ? Math.round(magnitude) : Math.round(magnitude * 10) / 10;
  return { arrow, text: `${rounded}% vs. anterior` };
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Formato compacto só pro eixo X ("01/02/18") — o formato por extenso ocupa ~85px por rótulo e
// vira sopa de texto sobreposto com vários exames; o tooltip continua usando o formato longo.
function formatDateAxis(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatReferenceCaption(referenceRange: ReferenceRange | null, unit?: string | null) {
  if (!referenceRange) return null;
  const { min, max } = referenceRange;
  const withUnit = (v: number) => `${formatValue(v)}${unit ? ` ${unit}` : ''}`;
  if (min != null && max != null) return `Faixa de referência: ${formatValue(min)} a ${withUnit(max)}`;
  if (max != null) return `Faixa de referência: até ${withUnit(max)}`;
  if (min != null) return `Faixa de referência: acima de ${withUnit(min)}`;
  return null;
}

interface TrendChartProps {
  points: TrendPoint[];
  unit?: string | null;
  referenceRange: ReferenceRange | null;
}

export function TrendChart({ points, unit, referenceRange }: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { xScale, yScale, yTicks, bandY, bandH } = useMemo(() => {
    const dates = points.map((p) => p.date.getTime());
    const values = points.map((p) => p.value);

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateSpan = maxDate - minDate || 1;

    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    if (referenceRange?.min != null) yMin = Math.min(yMin, referenceRange.min);
    if (referenceRange?.max != null) yMax = Math.max(yMax, referenceRange.max);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const pad = (yMax - yMin) * 0.15;
    yMin -= pad;
    yMax += pad;

    const xScale = (t: number) => (points.length === 1 ? PLOT_W / 2 : ((t - minDate) / dateSpan) * PLOT_W);
    const yScale = (v: number) => PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;

    const yTicks = [yMin + (yMax - yMin) * 0.05, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.05];

    const bandTop = referenceRange?.max != null ? yScale(referenceRange.max) : 0;
    const bandBottom = referenceRange?.min != null ? yScale(referenceRange.min) : PLOT_H;

    return { xScale, yScale, yTicks, bandY: bandTop, bandH: bandBottom - bandTop };
  }, [points, referenceRange]);

  // Rotula só pontos com folga horizontal mínima entre si (varredura da esquerda pra direita).
  // Um rótulo por ponto sobrepõe texto assim que os exames passam de ~6 ou têm datas próximas —
  // era o bug do desktop. O eixo é um guia; a data exata de cada ponto continua no hover.
  const labeledIndices = useMemo(() => {
    const MIN_LABEL_GAP = 64; // px do viewBox: "01/02/18" a fontSize 10 ≈ 46px + respiro
    const chosen = new Set<number>();
    let lastX = -Infinity;
    points.forEach((p, i) => {
      const x = xScale(p.date.getTime());
      if (x - lastX >= MIN_LABEL_GAP) {
        chosen.add(i);
        lastX = x;
      }
    });
    return chosen;
  }, [points, xScale]);

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date.getTime())} ${yScale(p.value)}`)
    .join(' ');

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH - MARGIN.left;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(xScale(p.date.getTime()) - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const last = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const referenceCaption = formatReferenceCaption(referenceRange, unit);
  const trend = trendBadge(points);

  // Posição do tooltip ancorado ao ponto sob o cursor, em % do viewBox (que o SVG preserva ao
  // escalar) — assim o balão acompanha o ponto sem depender de medir pixels em runtime. O clamp
  // horizontal impede que ele escape pelas bordas; perto do topo, o balão vai PARA BAIXO do ponto
  // pra não estourar a borda de cima nem cobrir o valor plotado acima.
  const hoveredLeftPct = hovered ? ((MARGIN.left + xScale(hovered.date.getTime())) / WIDTH) * 100 : 0;
  const hoveredTopPct = hovered ? ((MARGIN.top + yScale(hovered.value)) / HEIGHT) * 100 : 0;
  const tooltipLeftPct = Math.min(82, Math.max(18, hoveredLeftPct));
  const tooltipBelow = hoveredTopPct < 30;

  return (
    // max-w trava o SVG perto do tamanho nativo do viewBox (680px): sem isso, em monitor largo o
    // `w-full` escalava o gráfico ~3x (fonte, pontos, tudo) — o "gráfico gigante" do desktop.
    // Em telas menores que o teto, segue 100% fluido (o responsivo mobile continua igual).
    <div className="w-full max-w-[760px]">
      {(referenceCaption || trend) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{referenceCaption}</p>
          {trend && (
            <span
              className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              title="Variação do valor mais recente em relação ao anterior"
            >
              {trend.arrow} {trend.text}
            </span>
          )}
        </div>
      )}
      <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {referenceRange && (
            <>
              <rect x={0} y={bandY} width={PLOT_W} height={bandH} fill={PRIMARY} fillOpacity={0.08} />
              {referenceRange.max != null && (
                <line
                  x1={0}
                  x2={PLOT_W}
                  y1={yScale(referenceRange.max)}
                  y2={yScale(referenceRange.max)}
                  stroke={PRIMARY}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              )}
              {referenceRange.min != null && (
                <line
                  x1={0}
                  x2={PLOT_W}
                  y1={yScale(referenceRange.min)}
                  y2={yScale(referenceRange.min)}
                  stroke={PRIMARY}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              )}
            </>
          )}

          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={0} x2={PLOT_W} y1={yScale(v)} y2={yScale(v)} stroke={BORDER} strokeWidth={1} />
              <text
                x={-8}
                y={yScale(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill={PRIMARY_DARK}
                opacity={0.6}
              >
                {formatValue(v)}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            labeledIndices.has(i) ? (
              <text
                key={i}
                x={xScale(p.date.getTime())}
                y={PLOT_H + 20}
                textAnchor="middle"
                fontSize={10}
                fill={PRIMARY_DARK}
                opacity={0.6}
              >
                {formatDateAxis(p.date)}
              </text>
            ) : null,
          )}

          <path d={path} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Ponto fora da faixa de referência (avaliado contra a referência DAQUELE ponto) sai
              em vermelho — o sinal visual imediato de "aqui saiu do normal". */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={xScale(p.date.getTime())}
              cy={yScale(p.value)}
              r={5}
              fill={isOutOfRange(p.value, p.referenceValue) ? DESTRUCTIVE : PRIMARY}
              stroke="white"
              strokeWidth={2}
            />
          ))}

          {/* Ancorado no fim (right-aligned na borda direita do viewBox) — com anchor no início a
              partir do último ponto, o texto estourava a margem direita e era cortado ("109 mg/"). */}
          <text
            x={PLOT_W + MARGIN.right - 2}
            y={yScale(last!.value) - 10}
            textAnchor="end"
            fontSize={12}
            fontWeight={600}
            fill={PRIMARY_DARK}
          >
            {formatValue(last!.value)}
            {unit ? ` ${unit}` : ''}
          </text>

          {hovered && (
            <>
              <line
                x1={xScale(hovered.date.getTime())}
                x2={xScale(hovered.date.getTime())}
                y1={0}
                y2={PLOT_H}
                stroke={PRIMARY_DARK}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
              <circle
                cx={xScale(hovered.date.getTime())}
                cy={yScale(hovered.value)}
                r={7}
                fill={isOutOfRange(hovered.value, hovered.referenceValue) ? DESTRUCTIVE : PRIMARY}
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
        </g>
      </svg>

        {/* Tooltip ANCORADO ao ponto sob o cursor: pequeno e leve, flutua logo acima (ou abaixo,
            perto do topo) da bolinha, conectado a ela pela guia vertical. Info acessória — não
            rouba a cena nem a fixa num canto; o valor plotado continua sendo o protagonista. */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card/95 px-2 py-1 text-[11px] shadow-sm"
            style={{
              left: `${tooltipLeftPct}%`,
              top: `${hoveredTopPct}%`,
              transform: tooltipBelow
                ? 'translate(-50%, 14px)'
                : 'translate(-50%, calc(-100% - 14px))',
            }}
          >
            <div>
              <span className="font-semibold text-foreground">
                {formatValue(hovered.value)}
                {unit ? ` ${unit}` : ''}
              </span>
              <span className="text-muted-foreground"> · {formatDateShort(hovered.date)}</span>
            </div>
            {(hovered.laboratoryName || hovered.requestingDoctor) && (
              <div className="text-muted-foreground">
                {[hovered.laboratoryName, hovered.requestingDoctor].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
