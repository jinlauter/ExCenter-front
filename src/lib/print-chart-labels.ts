// Posicionamento de rótulos de valor nos gráficos do laudo impresso (sparkline do
// LaudoPrintView). Mesma estratégia do TrendChart interativo — que mantém uma cópia própria
// inline porque lá o layout considera hover e rótulos de data do eixo; aqui a versão é pura e
// testável, sem estado de tela:
//
// 1. QUAIS mostrar: as pontas sempre (ancoram a série); pontos do meio disputam por "surpresa"
//    (o quanto fogem da reta entre os vizinhos), aceitos em ordem de surpresa exigindo folga
//    horizontal mínima — série apertada esconde o redundante em vez de virar sopa de números.
// 2. ONDE: tenta acima do ponto, senão abaixo; só exibe se a caixinha do texto não colidir com
//    a linha da série, com caixas já ocupadas (datas, eixos) nem sair dos limites. No papel não
//    existe hover — o que a regra esconder some de vez, preço de não sobrepor.

export interface LabelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Segmento (x1,y1)-(x2,y2) cruza o retângulo? Liang-Barsky: recorta o parâmetro t do segmento
// contra as 4 bordas; sobra intervalo => há interseção.
export function segmentIntersectsBox(
  x1: number, y1: number, x2: number, y2: number, box: LabelBox,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - box.left, box.right - x1, y1 - box.top, box.bottom - y1];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 4; k++) {
    if (p[k] === 0) {
      if (q[k]! < 0) return false;
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

export interface PlacedValueLabel {
  index: number;
  baselineY: number;
}

export function placeValueLabels(params: {
  xs: number[];
  ys: number[];
  labels: string[];
  fontSize: number;
  /** Folga horizontal mínima entre rótulos MOSTRADOS (px do viewBox). */
  keepMinGap: number;
  /** Caixas já ocupadas (datas do eixo etc.) que rótulo nenhum pode invadir. */
  occupied: LabelBox[];
  bounds: LabelBox;
}): PlacedValueLabel[] {
  const { xs, ys, labels, fontSize, keepMinGap, occupied, bounds } = params;
  const n = xs.length;
  if (n === 0) return [];

  const values = ys; // a "surpresa" é geométrica: fuga da reta entre vizinhos, em px
  const surprise = values.map((y, i) =>
    i === 0 || i === n - 1 ? Number.POSITIVE_INFINITY : Math.abs(y - (values[i - 1]! + values[i + 1]!) / 2),
  );

  const kept = new Set<number>();
  const keptXs: number[] = [];
  [...Array(n).keys()]
    .sort((a, b) => surprise[b]! - surprise[a]!)
    .forEach((i) => {
      if (keptXs.every((kx) => Math.abs(kx - xs[i]!) >= keepMinGap)) {
        kept.add(i);
        keptXs.push(xs[i]!);
      }
    });

  const ascent = fontSize * 0.8;
  const descent = fontSize * 0.25;
  const charWidth = fontSize * 0.56;
  const taken: LabelBox[] = [...occupied];
  const placed: PlacedValueLabel[] = [];

  for (let i = 0; i < n; i++) {
    if (!kept.has(i)) continue;
    const half = labels[i]!.length * charWidth / 2 + 1.5;
    const candidates = [ys[i]! - fontSize * 0.75, ys[i]! + fontSize * 1.35]; // acima, senão abaixo
    for (const baselineY of candidates) {
      const box: LabelBox = {
        left: xs[i]! - half,
        top: baselineY - ascent,
        right: xs[i]! + half,
        bottom: baselineY + descent,
      };
      if (box.left < bounds.left || box.right > bounds.right || box.top < bounds.top || box.bottom > bounds.bottom) {
        continue;
      }
      if (taken.some((o) => boxesOverlap(box, o))) continue;
      let hitsLine = false;
      for (let k = 0; k < n - 1 && !hitsLine; k++) {
        hitsLine = segmentIntersectsBox(xs[k]!, ys[k]!, xs[k + 1]!, ys[k + 1]!, box);
      }
      if (hitsLine) continue;
      taken.push(box);
      placed.push({ index: i, baselineY });
      break;
    }
  }

  return placed;
}
