import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LaudoPrintView } from '@/components/laudo-print-view';
import type { ExamDetailResponse, ExamDetailResult } from '@/types/api';

function makeResult(overrides: Partial<ExamDetailResult> = {}): ExamDetailResult {
  return {
    resultId: crypto.randomUUID(),
    parameterName: 'Hemoglobina',
    numericResultValue: 14.6,
    unit: 'g/dL',
    referenceValue: '13,0 a 17,0',
    referenceMin: 13,
    referenceMax: 17,
    isAbnormal: false,
    history: [],
    ...overrides,
  };
}

const history = [
  { date: '2024-01-10T00:00:00Z', value: 14.1 },
  { date: '2025-08-02T00:00:00Z', value: 14.6 },
];

function makeExam(overrides: Partial<ExamDetailResponse> = {}): ExamDetailResponse {
  return {
    testId: 'test-1',
    examDate: '2026-01-20T00:00:00Z',
    requestingDoctor: 'Luis Eduardo Agner Machado Martins',
    laboratoryName: 'FRISCHMANN AISENGART',
    abnormalCount: 0,
    resultCount: 1,
    groups: [
      {
        name: 'Hemograma',
        isSingle: false,
        material: 'Sangue Total',
        method: 'Impedância',
        results: [makeResult({ history })],
      },
    ],
    ...overrides,
  };
}

describe('LaudoPrintView — o laudo ExCenter pronto pra PDF', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('chama o diálogo de impressão sozinho após montar (com folga pros SVGs)', () => {
    render(<LaudoPrintView exam={makeExam()} />);

    expect(window.print).not.toHaveBeenCalled();
    vi.advanceTimersByTime(700);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('cabeçalho: marca, procedência, data/médico/lab e badge', () => {
    render(<LaudoPrintView exam={makeExam({ abnormalCount: 2, resultCount: 25 })} />);

    expect(screen.getByText('ExCenter')).toBeInTheDocument();
    expect(screen.getByText('Seus exames, um só histórico')).toBeInTheDocument();
    expect(screen.getByText('20 de janeiro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Luis Eduardo Agner Machado Martins')).toBeInTheDocument();
    // Nome do lab em title case (documento formal), não o CAPS do banco.
    expect(screen.getAllByText('Frischmann Aisengart').length).toBeGreaterThan(0);
    expect(screen.getByText('2 de 25 fora da faixa')).toBeInTheDocument();
  });

  it('linha com 2+ pontos ganha sparkline com os valores; sem histórico, o aviso de primeiro registro', () => {
    render(
      <LaudoPrintView
        exam={makeExam({
          groups: [
            {
              name: 'Hemograma',
              isSingle: false,
              material: null,
              method: null,
              results: [makeResult({ history }), makeResult({ parameterName: 'Novo Marcador', history: [] })],
            },
          ],
        })}
      />,
    );

    // Valores do sparkline (pt-BR) — as duas pontas sempre são rotuladas.
    expect(screen.getByText('14,1')).toBeInTheDocument();
    expect(screen.getByText(/primeiro registro/)).toBeInTheDocument();
  });

  it('"Em destaque" só existe com marcador fora da faixa E com histórico', () => {
    const { rerender } = render(<LaudoPrintView exam={makeExam()} />);
    expect(screen.queryByText(/Em destaque/)).not.toBeInTheDocument();

    rerender(
      <LaudoPrintView
        exam={makeExam({
          groups: [
            {
              name: 'Ferritina',
              isSingle: true,
              material: null,
              method: null,
              results: [makeResult({ parameterName: 'Ferritina', isAbnormal: true, history })],
            },
          ],
        })}
      />,
    );
    expect(screen.getByText(/Em destaque/)).toBeInTheDocument();
    // O gráfico grande é o TrendChart do produto (viewBox 680x260).
    expect(document.querySelector('svg[viewBox="0 0 680 260"]')).not.toBeNull();
  });

  it('fora da faixa mas SEM histórico não entra no destaque (nada pra evoluir)', () => {
    render(
      <LaudoPrintView
        exam={makeExam({
          groups: [
            {
              name: 'Ferritina',
              isSingle: true,
              material: null,
              method: null,
              results: [makeResult({ parameterName: 'Ferritina', isAbnormal: true, history: [] })],
            },
          ],
        })}
      />,
    );

    expect(screen.queryByText(/Em destaque/)).not.toBeInTheDocument();
  });

  it('rodapé carrega o aviso de não-substituição de avaliação médica', () => {
    render(<LaudoPrintView exam={makeExam()} />);

    expect(screen.getByText(/não substitui avaliação médica/)).toBeInTheDocument();
  });
});
