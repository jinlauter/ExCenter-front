import { placeValueLabels, type LabelBox } from '@/lib/print-chart-labels';
import { isValueOutsideRange, type ReferenceRange } from '@/lib/reference-range';

// =============================================================================
// LaudoSparkline — o mini-gráfico de cada linha do laudo ExCenter impresso
// =============================================================================
// Porta fiel do protótipo aprovado (excenter-snapshots/2026-08-14-laudo-template): banda da
// faixa de referência ATUAL, linha da série, pontos (vermelho = fora da faixa de HOJE, mesma
// regra do TrendChart), valores com anti-colisão e as datas das pontas. Resolve o problema de
// escala do laudo: 50+ parâmetros com histórico caberiam em ~8 páginas só com gráfico DENTRO
// da linha — um gráfico grande por parâmetro daria um PDF de 30+.
//
// Cores fixas em hex (não var(--...)) de propósito: o documento imprime igual em qualquer
// tema, e foi ESTE visual que o dono aprovou no protótipo.
// =============================================================================

const WIDTH = 190;
const HEIGHT = 52;
const PAD_X = 10;
const PAD_Y = 10;
const DATE_FONT = 6.5;
const VALUE_FONT = 6;

const PRIMARY = '#0F6E56';
const PRIMARY_DARK = '#04342C';
const PRIMARY_LIGHT = '#E1F5EE';
const RED = '#dc2626';
const GRAY = '#6b7280';

export interface SparklinePoint {
  date: Date;
  value: number;
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatValue(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

export function LaudoSparkline({
  points,
  referenceRange,
}: {
  points: SparklinePoint[];
  referenceRange: ReferenceRange | null;
}) {
  const n = points.length;
  const xs = points.map((_, i) => PAD_X + (WIDTH - 2 * PAD_X) * (n === 1 ? 0.5 : i / (n - 1)));
  const values = points.map((p) => p.value);

  // Escala Y cobre valores E banda (com folga), pra banda nunca "vazar" do gráfico.
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (referenceRange?.min != null) lo = Math.min(lo, referenceRange.min);
  if (referenceRange?.max != null) hi = Math.max(hi, referenceRange.max);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const span = hi - lo;
  lo -= span * 0.08;
  hi += span * 0.08;
  const y = (v: number) => PAD_Y + (HEIGHT - 2 * PAD_Y) * (1 - (v - lo) / (hi - lo));
  const ys = values.map(y);

  const bandTop = referenceRange ? y(referenceRange.max ?? hi) : null;
  const bandBottom = referenceRange ? y(referenceRange.min ?? lo) : null;

  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(' ');
  const outside = values.map((v) => isValueOutsideRange(v, referenceRange));

  // Datas das pontas entram como caixas ocupadas — rótulo "abaixo" não pode invadi-las.
  const firstDate = formatDateShort(points[0]!.date);
  const lastDate = formatDateShort(points[n - 1]!.date);
  const dateCharW = DATE_FONT * 0.56;
  const occupied: LabelBox[] = [
    { left: PAD_X - 4, top: HEIGHT + 9 - DATE_FONT * 0.8, right: PAD_X - 4 + firstDate.length * dateCharW, bottom: HEIGHT + 9 + DATE_FONT * 0.25 },
    { left: WIDTH - PAD_X + 4 - lastDate.length * dateCharW, top: HEIGHT + 9 - DATE_FONT * 0.8, right: WIDTH - PAD_X + 4, bottom: HEIGHT + 9 + DATE_FONT * 0.25 },
  ];

  const labels = values.map(formatValue);
  const placed = placeValueLabels({
    xs,
    ys,
    labels,
    fontSize: VALUE_FONT,
    keepMinGap: 24,
    occupied,
    bounds: { left: 0, top: 1, right: WIDTH, bottom: HEIGHT + 11 },
  });

  return (
    <svg width={WIDTH} height={HEIGHT + 12} viewBox={`0 0 ${WIDTH} ${HEIGHT + 12}`} aria-hidden="true">
      {bandTop != null && bandBottom != null && (
        <rect
          x={PAD_X - 4}
          y={bandTop}
          width={WIDTH - 2 * PAD_X + 8}
          height={Math.max(bandBottom - bandTop, 2)}
          fill={PRIMARY_LIGHT}
          rx={2}
        />
      )}
      <path d={path} fill="none" stroke={PRIMARY} strokeWidth={1.4} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xs[i]}
          cy={ys[i]}
          r={i === n - 1 ? 3 : 2.2}
          fill={outside[i] ? RED : PRIMARY}
        />
      ))}
      {placed.map(({ index, baselineY }) => (
        <text
          key={index}
          x={xs[index]}
          y={baselineY}
          fontSize={VALUE_FONT}
          fontWeight={600}
          fill={outside[index] ? RED : PRIMARY_DARK}
          textAnchor="middle"
        >
          {labels[index]}
        </text>
      ))}
      <text x={PAD_X - 4} y={HEIGHT + 9} fontSize={DATE_FONT} fill={GRAY}>
        {firstDate}
      </text>
      <text x={WIDTH - PAD_X + 4} y={HEIGHT + 9} fontSize={DATE_FONT} fill={GRAY} textAnchor="end">
        {lastDate}
      </text>
    </svg>
  );
}
