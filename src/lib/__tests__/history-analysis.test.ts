import { describe, expect, it } from 'vitest';
import { computeHistoryAnalysis } from '@/lib/history-analysis';
import type { BloodTestResultQueryResponse } from '@/types/api';

let seq = 0;
function makeResult(overrides: Partial<BloodTestResultQueryResponse> = {}): BloodTestResultQueryResponse {
  seq += 1;
  return {
    resultId: `result-${seq}`,
    testId: 'test-1',
    patientName: 'Fulano de Tal',
    laboratoryName: 'Laboratório A',
    testDate: '2026-01-01T00:00:00Z',
    parameterName: 'Hemoglobina',
    groupName: 'Hemograma',
    numericResultValue: 14,
    unit: 'g/dL',
    referenceValue: '12 a 16',
    ...overrides,
  };
}

describe('computeHistoryAnalysis', () => {
  it('retorna estado vazio quando não há resultados', () => {
    const analysis = computeHistoryAnalysis([]);

    expect(analysis.examsSorted).toEqual([]);
    expect(analysis.latestExam).toBeNull();
    expect(analysis.groups.size).toBe(0);
    expect(analysis.trendable).toEqual([]);
  });

  it('agrupa resultados do exame mais recente por groupName, usando "Outros" quando ausente', () => {
    const results = [
      makeResult({ testId: 'exame-1', testDate: '2026-01-01T00:00:00Z', groupName: 'Hemograma' }),
      makeResult({ testId: 'exame-1', testDate: '2026-01-01T00:00:00Z', groupName: null, parameterName: 'Glicose' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect([...analysis.groups.keys()]).toEqual(['Hemograma', 'Outros']);
  });

  it('considera "latestExam" o exame com testDate mais recente, não o último do array', () => {
    const results = [
      makeResult({ testId: 'exame-recente', testDate: '2026-06-01T00:00:00Z' }),
      makeResult({ testId: 'exame-antigo', testDate: '2026-01-01T00:00:00Z' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect(analysis.latestExam!.testId).toBe('exame-recente');
  });

  it('só inclui parâmetros com 2+ pontos em "trendable"', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z', parameterName: 'Hemoglobina' }),
      makeResult({ testId: 'e2', testDate: '2026-02-01T00:00:00Z', parameterName: 'Hemoglobina' }),
      makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z', parameterName: 'Único' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    const labels = analysis.trendable.map((s) => s.parameterName);
    expect(labels).toContain('Hemoglobina');
    expect(labels).not.toContain('Único');
  });

  it('trata o mesmo parâmetro com unidades diferentes como séries separadas', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z', parameterName: 'Linfócitos', unit: '%' }),
      makeResult({ testId: 'e2', testDate: '2026-02-01T00:00:00Z', parameterName: 'Linfócitos', unit: '%' }),
      makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z', parameterName: 'Linfócitos', unit: '/μL' }),
      makeResult({ testId: 'e2', testDate: '2026-02-01T00:00:00Z', parameterName: 'Linfócitos', unit: '/μL' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    const linfocitosSeries = analysis.trendable.filter((s) => s.parameterName === 'Linfócitos');
    expect(linfocitosSeries).toHaveLength(2);
    // Como há mais de uma série com o mesmo nome, o label inclui a unidade pra desambiguar.
    expect(linfocitosSeries.map((s) => s.label).sort()).toEqual(['Linfócitos (%)', 'Linfócitos (/μL)']);
  });

  it('calcula o delta em relação ao valor anterior do mesmo parâmetro', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z', parameterName: 'Hemoglobina', numericResultValue: 13 }),
      makeResult({ testId: 'e2', testDate: '2026-02-01T00:00:00Z', parameterName: 'Hemoglobina', numericResultValue: 14.5 }),
    ];

    const analysis = computeHistoryAnalysis(results);

    const latestGroupItems = [...analysis.groups.values()].flat();
    const hemoglobina = latestGroupItems.find((r) => r.parameterName === 'Hemoglobina');
    expect(hemoglobina!.delta).toBeCloseTo(1.5);
  });

  it('delta é null quando não há valor anterior', () => {
    const results = [makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z' })];

    const analysis = computeHistoryAnalysis(results);

    const items = [...analysis.groups.values()].flat();
    expect(items[0]!.delta).toBeNull();
  });

  it('ignora resultados sem numericResultValue ao montar as séries de tendência', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2026-01-01T00:00:00Z', numericResultValue: null, stringResultValue: 'Não reagente' }),
      makeResult({ testId: 'e2', testDate: '2026-02-01T00:00:00Z', numericResultValue: null, stringResultValue: 'Não reagente' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect(analysis.trendable).toEqual([]);
  });

});

// O furo nº 1 fechado no front: com o analito canônico no payload, grafias diferentes de
// laboratórios diferentes viram UMA série — e o rótulo é a grafia que mais apareceu.
describe('computeHistoryAnalysis — agrupamento pelo analito canônico', () => {
  it('grafias diferentes do mesmo analito viram uma série só', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2025-03-01T00:00:00Z', parameterName: 'COLESTEROL TOTAL', numericResultValue: 232, canonicalAnalyteId: 23632, material: 'Soro' }),
      makeResult({ testId: 'e2', testDate: '2025-07-01T00:00:00Z', parameterName: 'Colesterol', numericResultValue: 214, canonicalAnalyteId: 23632, material: 'Soro' }),
      makeResult({ testId: 'e3', testDate: '2026-05-01T00:00:00Z', parameterName: 'Colesterol total', numericResultValue: 190, canonicalAnalyteId: 23632, material: 'Soro' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect(analysis.trendable).toHaveLength(1);
    expect(analysis.trendable[0]!.points.map((p) => p.value)).toEqual([232, 214, 190]);
  });

  it('o rótulo da série é a grafia que MAIS apareceu, contando sem diferenciar caixa', () => {
    // 2× "TGO" + 1× "tgo" = 3 votos da família "tgo" (exibe "TGO", a forma exata mais comum);
    // "Aspartato aminotransferase" tem só 2 — perde mesmo sendo o nome técnico.
    const results = [
      makeResult({ testId: 'e1', testDate: '2025-01-01T00:00:00Z', parameterName: 'TGO', numericResultValue: 30, canonicalAnalyteId: 23628 }),
      makeResult({ testId: 'e2', testDate: '2025-02-01T00:00:00Z', parameterName: 'TGO', numericResultValue: 31, canonicalAnalyteId: 23628 }),
      makeResult({ testId: 'e3', testDate: '2025-03-01T00:00:00Z', parameterName: 'tgo', numericResultValue: 32, canonicalAnalyteId: 23628 }),
      makeResult({ testId: 'e4', testDate: '2025-04-01T00:00:00Z', parameterName: 'Aspartato aminotransferase', numericResultValue: 33, canonicalAnalyteId: 23628 }),
      makeResult({ testId: 'e5', testDate: '2025-05-01T00:00:00Z', parameterName: 'Aspartato aminotransferase', numericResultValue: 34, canonicalAnalyteId: 23628 }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect(analysis.trendable).toHaveLength(1);
    expect(analysis.trendable[0]!.label).toBe('TGO');
  });

  it('empate no rótulo decide pela grafia do exame mais recente', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2025-01-01T00:00:00Z', parameterName: 'AST', numericResultValue: 30, canonicalAnalyteId: 23628 }),
      makeResult({ testId: 'e2', testDate: '2026-02-01T00:00:00Z', parameterName: 'TGO', numericResultValue: 31, canonicalAnalyteId: 23628 }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect(analysis.trendable[0]!.label).toBe('TGO'); // 1×1, mas TGO é o mais recente
  });

  it('mesmo analito em materiais diferentes NÃO se mistura (soro × urina)', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2025-01-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 90, canonicalAnalyteId: 23747, material: 'Soro' }),
      makeResult({ testId: 'e2', testDate: '2025-02-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 95, canonicalAnalyteId: 23747, material: 'Soro' }),
      makeResult({ testId: 'e3', testDate: '2025-03-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 2, canonicalAnalyteId: 23747, material: 'Urina' }),
    ];

    const analysis = computeHistoryAnalysis(results);

    // Só a série do soro tem 2+ pontos; a da urina (1 ponto) não é "trendable" — e sobretudo
    // o ponto da urina NÃO entrou na série do soro.
    expect(analysis.trendable).toHaveLength(1);
    expect(analysis.trendable[0]!.points.map((p) => p.value)).toEqual([90, 95]);
  });

  it('mesmo analito em unidades diferentes vira séries separadas (sem conversão ainda)', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2025-01-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 90, unit: 'mg/dL', canonicalAnalyteId: 23747 }),
      makeResult({ testId: 'e2', testDate: '2025-02-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 95, unit: 'mg/dL', canonicalAnalyteId: 23747 }),
      makeResult({ testId: 'e3', testDate: '2025-01-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 5.0, unit: 'mmol/L', canonicalAnalyteId: 23747 }),
      makeResult({ testId: 'e4', testDate: '2025-02-01T00:00:00Z', parameterName: 'Glicose', numericResultValue: 5.3, unit: 'mmol/L', canonicalAnalyteId: 23747 }),
    ];

    const analysis = computeHistoryAnalysis(results);

    expect(analysis.trendable).toHaveLength(2);
    // Mesmo nome vencedor nas duas → a unidade desambigua o rótulo.
    expect(analysis.trendable.map((s) => s.label).sort()).toEqual(['Glicose (mg/dL)', 'Glicose (mmol/L)']);
  });

  it('sem canonicalAnalyteId cai no fallback por nome+unidade exatos (comportamento antigo)', () => {
    const results = [
      makeResult({ testId: 'e1', testDate: '2025-01-01T00:00:00Z', parameterName: 'Exame Raro', numericResultValue: 1 }),
      makeResult({ testId: 'e2', testDate: '2025-02-01T00:00:00Z', parameterName: 'Exame Raro', numericResultValue: 2 }),
      makeResult({ testId: 'e3', testDate: '2025-03-01T00:00:00Z', parameterName: 'EXAME RARO', numericResultValue: 3 }),
    ];

    const analysis = computeHistoryAnalysis(results);

    // Grafia diferente sem mapeamento = série separada (1 ponto, não-trendable).
    expect(analysis.trendable).toHaveLength(1);
    expect(analysis.trendable[0]!.points.map((p) => p.value)).toEqual([1, 2]);
  });
});
