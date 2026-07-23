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
