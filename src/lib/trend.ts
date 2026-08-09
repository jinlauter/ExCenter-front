// Tendência de uma série: quanto o valor MAIS RECENTE variou frente ao imediatamente anterior
// (não o primeiro da série — o que importa é "mudou desde a última vez"). Cálculo puro e
// NEUTRO: não decide se subir é bom ou ruim, porque isso depende do analito (colesterol subir é
// ruim, HDL subir é bom, e nem sempre sabemos qual é qual). A apresentação — seta, "%", cor —
// fica no componente; aqui mora só a matemática, isolada para poder ser testada sem renderizar.

export interface TrendComputation {
  direction: 'up' | 'down' | 'flat';
  /** Variação percentual vs. o anterior. null quando o anterior é 0 — não há base para um %. */
  percent: number | null;
  /** Variação absoluta (mais recente − anterior). Sempre disponível, inclusive quando percent é null. */
  absoluteChange: number;
}

// Recebe os valores JÁ ordenados por data (do mais antigo ao mais recente) — os dois últimos
// são o que interessa. Menos de dois pontos não é tendência: retorna null.
export function computeTrend(valuesOldestToNewest: number[]): TrendComputation | null {
  if (valuesOldestToNewest.length < 2) return null;

  const current = valuesOldestToNewest[valuesOldestToNewest.length - 1]!;
  const previous = valuesOldestToNewest[valuesOldestToNewest.length - 2]!;
  const absoluteChange = current - previous;

  const direction = absoluteChange > 0 ? 'up' : absoluteChange < 0 ? 'down' : 'flat';
  const percent = previous === 0 ? null : (absoluteChange / Math.abs(previous)) * 100;

  return { direction, percent, absoluteChange };
}
