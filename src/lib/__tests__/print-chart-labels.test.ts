import { describe, expect, it } from 'vitest';
import { boxesOverlap, placeValueLabels, segmentIntersectsBox } from '@/lib/print-chart-labels';

const WIDE_BOUNDS = { left: 0, top: 0, right: 1000, bottom: 1000 };

describe('placeValueLabels — quais rótulos mostrar', () => {
  it('as pontas sempre entram (ancoram a série)', () => {
    const placed = placeValueLabels({
      xs: [10, 100, 190],
      ys: [500, 500, 500],
      labels: ['1', '2', '3'],
      fontSize: 6,
      keepMinGap: 24,
      occupied: [],
      bounds: WIDE_BOUNDS,
    });

    const indices = placed.map((p) => p.index);
    expect(indices).toContain(0);
    expect(indices).toContain(2);
  });

  it('série apertada esconde o ponto do meio sem novidade (folga mínima)', () => {
    // 3 pontos em 30px com gap mínimo de 24: só as pontas cabem; o meio, colinear
    // (surpresa zero), perde a disputa.
    const placed = placeValueLabels({
      xs: [10, 25, 40],
      ys: [500, 500, 500],
      labels: ['1', '2', '3'],
      fontSize: 6,
      keepMinGap: 24,
      occupied: [],
      bounds: WIDE_BOUNDS,
    });

    expect(placed.map((p) => p.index).sort()).toEqual([0, 2]);
  });

  it('pico (surpresa alta) ganha a vaga do vizinho redundante', () => {
    // Entre os dois candidatos do meio, o pico (índice 2, foge 100px da reta) tem
    // prioridade sobre o colinear (índice 1), que nem folga tem das pontas.
    const placed = placeValueLabels({
      xs: [10, 40, 70, 130],
      ys: [500, 500, 400, 500],
      labels: ['a', 'b', 'c', 'd'],
      fontSize: 6,
      keepMinGap: 50,
      occupied: [],
      bounds: WIDE_BOUNDS,
    });

    const indices = placed.map((p) => p.index);
    expect(indices).toContain(2);
    expect(indices).not.toContain(1);
  });
});

describe('placeValueLabels — onde colocar', () => {
  it('tenta acima; caixa ocupada acima empurra o rótulo pra baixo do ponto', () => {
    const above = { left: 50, top: 480, right: 150, bottom: 497 }; // cobre a posição "acima" do ponto único
    const placed = placeValueLabels({
      xs: [100],
      ys: [500],
      labels: ['9'],
      fontSize: 6,
      keepMinGap: 24,
      occupied: [above],
      bounds: WIDE_BOUNDS,
    });

    expect(placed).toHaveLength(1);
    expect(placed[0]!.baselineY).toBeGreaterThan(500); // acabou abaixo
  });

  it('sem lugar acima nem abaixo, o rótulo some — garantia final de não-sobreposição', () => {
    const everywhere = { left: 0, top: 400, right: 200, bottom: 600 };
    const placed = placeValueLabels({
      xs: [100],
      ys: [500],
      labels: ['9'],
      fontSize: 6,
      keepMinGap: 24,
      occupied: [everywhere],
      bounds: WIDE_BOUNDS,
    });

    expect(placed).toHaveLength(0);
  });

  it('rótulo que sairia dos limites do gráfico some em vez de vazar', () => {
    const placed = placeValueLabels({
      xs: [5],
      ys: [5],
      labels: ['123456'],
      fontSize: 6,
      keepMinGap: 24,
      occupied: [],
      bounds: { left: 0, top: 4, right: 8, bottom: 6 },
    });

    expect(placed).toHaveLength(0);
  });
});

describe('geometria de apoio', () => {
  it('boxesOverlap detecta interseção e rejeita caixas disjuntas', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(boxesOverlap(a, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true);
    expect(boxesOverlap(a, { left: 11, top: 0, right: 20, bottom: 10 })).toBe(false);
  });

  it('segmentIntersectsBox: segmento cruzando, dentro e fora', () => {
    const box = { left: 10, top: 10, right: 20, bottom: 20 };
    expect(segmentIntersectsBox(0, 15, 30, 15, box)).toBe(true); // atravessa
    expect(segmentIntersectsBox(12, 12, 18, 18, box)).toBe(true); // inteiro dentro
    expect(segmentIntersectsBox(0, 0, 5, 5, box)).toBe(false); // longe
  });
});
