'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReferenceRange } from '@/lib/reference-range';
import { isValueOutsideRange } from '@/lib/reference-range';
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
// para % (anterior = 0), cai na variação absoluta. Sem variação mostra "atual igual ao anterior"
// (o cálculo compara só os dois últimos exames — o "=" deixa isso explícito, sem sugerir que a
// série inteira está parada).
const ARROW_BY_DIRECTION = { up: '↑', down: '↓', flat: '=' } as const;

function trendBadge(points: TrendPoint[]): { arrow: string; text: string } | null {
  const trend = computeTrend(points.map((p) => p.value));
  if (!trend) return null;
  const arrow = ARROW_BY_DIRECTION[trend.direction];
  if (trend.direction === 'flat') return { arrow, text: 'atual igual ao anterior' };
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

// Geometria da caixa do rótulo de valor, para decidir quando ele cairia POR CIMA da linha.
// Valores medidos no render: texto fontSize 10 / weight 600, centrado no x do ponto, base 12px
// acima da bolinha. Um dígito avança ~6px nesse tamanho; usar a mais (caixa um tico maior) só
// deixa a checagem mais conservadora — na dúvida, esconde.
const LABEL_CHAR_WIDTH = 6;
const LABEL_SIDE_PADDING = 2;
const LABEL_BASE_GAP = 12; // base do texto acima da bolinha
const LABEL_ASCENT = 8; // subida dos glifos acima da base
const LABEL_DESCENT = 2;
// Espaçamento horizontal mínimo (px do viewBox) entre valores MOSTRADOS. Em px do viewBox porque o
// SVG escala inteiro com a tela — a relação de sobreposição é a mesma em qualquer aparelho. Numa
// região de exames apertados no tempo, os menos importantes caem abaixo deste gap e sobem só no
// hover; onde há folga, todos cabem. ~PLOT_W/17, um número legível de rótulos na largura cheia.
const LABEL_KEEP_MIN_GAP = 34;

interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Dois retângulos alinhados aos eixos se sobrepõem?
function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Segmento (x1,y1)-(x2,y2) cruza o retângulo alinhado aos eixos [rx1,ry1]-[rx2,ry2]? Liang-Barsky:
// recorta o parâmetro t do segmento contra as 4 bordas; sobra intervalo => há interseção.
function segmentIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rx1: number, ry1: number, rx2: number, ry2: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rx1, rx2 - x1, y1 - ry1, ry2 - y1];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 4; k++) {
    if (p[k] === 0) {
      if (q[k]! < 0) return false; // paralelo e fora desta borda
    } else {
      const r = q[k]! / p[k]!;
      if (p[k]! < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
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

  // Onde escrever o valor de cada ponto — ACIMA, ABAIXO, ou lugar nenhum. Duas etapas:
  //
  // 1. QUAIS mostrar (desafogar por importância). Numa região de exames apertados no tempo, mostrar
  //    todo valor vira ruído. Cada ponto ganha uma "surpresa" = o quanto seu valor foge da reta
  //    entre os dois vizinhos (ponto que cai em cima dessa reta é redundante → ~0; pico/vale →
  //    alto); as pontas entram sempre (ancoram a série). Aceita em ordem de surpresa, exigindo
  //    LABEL_KEEP_MIN_GAP px de folga de todo rótulo já aceito. É a regra pedida — "data muito
  //    próxima da média de espaçamento + valor sem novidade ⇒ oculta, fica só no hover" — mas a
  //    novidade é medida contra a TENDÊNCIA local, não só o ponto anterior.
  //
  // 2. ONDE colocar (acima/abaixo). Tenta acima primeiro (convenção), depois abaixo; aceita o lado
  //    que não cai sobre a linha nem sobre outro rótulo. Se nenhum couber, some — garantia final de
  //    não-sobreposição. Rótulos de DATA entram como ocupados, pra um valor "abaixo" não colidir.
  //
  // Mapa index -> y da base do texto; ausente = escondido (o hover ainda mostra o valor). Independe
  // do hover DE PROPÓSITO: layout estável, não reflui a cada mouse-move.
  const valueLabelBaselineByIndex = useMemo(() => {
    const lastIndex = points.length - 1;
    const positionX = points.map((p) => xScale(p.date.getTime()));

    // Etapa 1 — importância + folga mínima.
    const surprise = points.map((p, i) => {
      if (i === 0 || i === lastIndex) return Number.POSITIVE_INFINITY;
      const expected = (points[i - 1]!.value + points[i + 1]!.value) / 2;
      return Math.abs(p.value - expected);
    });
    const kept = new Set<number>();
    const keptX: number[] = [];
    points
      .map((_, i) => i)
      .sort((a, b) => surprise[b]! - surprise[a]!)
      .forEach((i) => {
        if (keptX.every((kx) => Math.abs(kx - positionX[i]!) >= LABEL_KEEP_MIN_GAP)) {
          kept.add(i);
          keptX.push(positionX[i]!);
        }
      });

    // Etapa 2 — coloca só os mantidos, acima/abaixo, sem sobrepor linha, datas ou outros rótulos.
    const occupied: LabelBox[] = [];
    points.forEach((point, index) => {
      if (!labeledIndices.has(index)) return;
      const x = positionX[index]!;
      const halfWidth = (formatDateAxis(point.date).length * LABEL_CHAR_WIDTH) / 2 + LABEL_SIDE_PADDING;
      occupied.push({
        left: x - halfWidth,
        right: x + halfWidth,
        top: PLOT_H + 20 - LABEL_ASCENT,
        bottom: PLOT_H + 20 + LABEL_DESCENT,
      });
    });

    const baselineByIndex = new Map<number, number>();
    points.forEach((point, index) => {
      if (!kept.has(index)) return;
      const x = positionX[index]!;
      const y = yScale(point.value);
      const halfWidth = (formatValue(point.value).length * LABEL_CHAR_WIDTH) / 2 + LABEL_SIDE_PADDING;
      const left = x - halfWidth;
      const right = x + halfWidth;
      const neighbors = [points[index - 1], points[index + 1]].filter(Boolean) as TrendPoint[];

      const candidates = [
        { baseline: y - LABEL_BASE_GAP, top: y - LABEL_BASE_GAP - LABEL_ASCENT, bottom: y - LABEL_BASE_GAP + LABEL_DESCENT },
        { baseline: y + LABEL_BASE_GAP + LABEL_ASCENT, top: y + LABEL_BASE_GAP, bottom: y + LABEL_BASE_GAP + LABEL_ASCENT + LABEL_DESCENT },
      ];

      for (const candidate of candidates) {
        const box: LabelBox = { left, right, top: candidate.top, bottom: candidate.bottom };
        const onLine = neighbors.some((n) =>
          segmentIntersectsRect(x, y, xScale(n.date.getTime()), yScale(n.value), left, candidate.top, right, candidate.bottom),
        );
        if (onLine) continue;
        if (occupied.some((placed) => boxesOverlap(placed, box))) continue;
        occupied.push(box);
        baselineByIndex.set(index, candidate.baseline);
        break;
      }
    });
    return baselineByIndex;
  }, [points, xScale, yScale, labeledIndices]);

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

          {/* Ponto fora da banda de referência EXIBIDA sai em vermelho — o sinal visual imediato de
              "aqui saiu do normal", e coerente com a faixa verde que o usuário vê. Colorimos pela
              banda (referenceRange), e não pela faixa de cada ponto, porque o parser ainda não
              entende laudos escritos "de X até Y" e deixava pontos fora da faixa em verde. Paliativo
              consciente — ver docs/BACKLOG.md "conector até". */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={xScale(p.date.getTime())}
              cy={yScale(p.value)}
              r={5}
              fill={isValueOutsideRange(p.value, referenceRange) ? DESTRUCTIVE : PRIMARY}
              stroke="white"
              strokeWidth={2}
            />
          ))}

          {/* Valor de cada ponto, colocado acima OU abaixo pela lógica anti-colisão
              (valueLabelBaselineByIndex). Some no ponto sob o cursor (o tooltip já mostra o valor,
              com procedência — repetir seria eco) e nos pontos sem lugar livre. Sem unidade por
              ponto — a landing também omite, e ela já aparece na legenda de referência e no tooltip. */}
          {points.map((p, i) => {
            const baseline = valueLabelBaselineByIndex.get(i);
            if (i === hoverIndex || baseline === undefined) return null;
            return (
              <text
                key={i}
                x={xScale(p.date.getTime())}
                y={baseline}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill={PRIMARY_DARK}
              >
                {formatValue(p.value)}
              </text>
            );
          })}

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
                fill={isValueOutsideRange(hovered.value, referenceRange) ? DESTRUCTIVE : PRIMARY}
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
