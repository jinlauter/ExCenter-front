import { describe, expect, it } from 'vitest';
import { computeTrend } from '@/lib/trend';

describe('computeTrend', () => {
  it('compara o mais recente com o imediatamente anterior, não o primeiro da série', () => {
    // 100 → 200 → 220: a tendência é 220 vs. 200 (+10%), ignorando o 100 lá atrás.
    const trend = computeTrend([100, 200, 220]);
    expect(trend).toEqual({ direction: 'up', percent: 10, absoluteChange: 20 });
  });

  it('marca queda com percentual negativo', () => {
    const trend = computeTrend([200, 150]);
    expect(trend?.direction).toBe('down');
    expect(trend?.percent).toBe(-25);
    expect(trend?.absoluteChange).toBe(-50);
  });

  it('valores iguais são estáveis (flat, 0%)', () => {
    expect(computeTrend([42, 42])).toEqual({ direction: 'flat', percent: 0, absoluteChange: 0 });
  });

  it('sem base (anterior = 0) devolve percent null mas mantém a variação absoluta', () => {
    const trend = computeTrend([0, 5]);
    expect(trend?.percent).toBeNull();
    expect(trend?.absoluteChange).toBe(5);
    expect(trend?.direction).toBe('up');
  });

  it('menos de dois pontos não é tendência', () => {
    expect(computeTrend([])).toBeNull();
    expect(computeTrend([10])).toBeNull();
  });

  it('percentual usa o módulo do anterior — anterior negativo não inverte o sinal da variação', () => {
    // de -10 para -5: subiu 5 (absoluteChange +5) => +50% sobre |−10|.
    const trend = computeTrend([-10, -5]);
    expect(trend?.direction).toBe('up');
    expect(trend?.percent).toBe(50);
  });
});
