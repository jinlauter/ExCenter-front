import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamResultsView } from '@/components/exam-results-view';
import type { ProcessedExamListItem, ProcessedExamsPageResponse } from '@/types/api';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  // Repassa TODOS os props (aria-label, title, onClick...) — um mock que só repassa href
  // faria testes de acessibilidade falharem por culpa do mock, não do componente.
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

function makeExam(overrides: Partial<ProcessedExamListItem> = {}): ProcessedExamListItem {
  return {
    testId: 'test-1',
    examDate: '2025-08-02T00:00:00Z',
    requestingDoctor: 'Jean Rodrigo Tafarel',
    laboratoryName: 'Lab União',
    includedExams: ['Hemograma', 'Ferritina'],
    resultCount: 25,
    abnormalCount: 0,
    ...overrides,
  };
}

function renderView(items: ProcessedExamListItem[], overrides: Partial<ProcessedExamsPageResponse> = {}) {
  const data: ProcessedExamsPageResponse = {
    items,
    page: 1,
    pageSize: 20,
    totalCount: items.length,
    totalPages: 1,
    ...overrides,
  };
  return render(<ExamResultsView data={data} />);
}

// Colunas: Data(0) Médico(1) Laboratório(2) Exames incluídos(3) Alterados(4) Ações(5).
function dataCell(container: HTMLElement, columnIndex: number, rowIndex = 0) {
  const row = container.querySelectorAll('tbody tr')[rowIndex]!;
  return row.children[columnIndex] as HTMLElement;
}

describe('ExamResultsView — colunas principais', () => {
  it('mostra data, médico e laboratório do exame', () => {
    const { container } = renderView([makeExam()]);

    expect(dataCell(container, 0).textContent).toBe('02/08/2025');
    expect(dataCell(container, 1).textContent).toBe('Jean Rodrigo Tafarel');
    expect(dataCell(container, 2).textContent).toBe('Lab União');
  });

  // Data/médico/lab vêm da extração por IA e podem legitimamente faltar — "—" com tooltip
  // explicando, nunca célula vazia sem contexto (tratamento combinado no planejamento).
  it('campos não extraídos mostram "—" com tooltip explicativo', () => {
    const { container } = renderView([
      makeExam({ examDate: null, requestingDoctor: null, laboratoryName: null }),
    ]);

    for (const col of [0, 1, 2]) {
      const cell = dataCell(container, col);
      expect(cell.textContent).toContain('—');
      expect(cell.querySelector('[role="tooltip"]')?.textContent).toMatch(/Não foi possível extrair/);
    }
  });
});

describe('ExamResultsView — célula "Exames incluídos"', () => {
  it('até 3 exames: lista direto, sem "..." nem ícone', () => {
    const { container } = renderView([makeExam({ includedExams: ['Hemograma', 'Ferritina', 'Glicose'] })]);

    const cell = dataCell(container, 3);
    expect(cell.textContent).toBe('Hemograma, Ferritina, Glicose');
    expect(cell.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('mais de 3: mostra 3 + "..." e tooltip à direita com a lista completa', () => {
    const names = ['Hemograma', 'Ferritina', 'Glicose', 'TSH', 'Vitamina D'];
    const { container } = renderView([makeExam({ includedExams: names })]);

    const cell = dataCell(container, 3);
    expect(cell.textContent).toContain('Hemograma, Ferritina, Glicose...');

    const tooltip = cell.querySelector('[role="tooltip"]')!;
    for (const name of names) expect(tooltip.textContent).toContain(name);
  });

  // Laudo grande: tooltip lista só 10 e sinaliza que há mais com uma linha "..." — o teto
  // existe pra lista não virar um poste; a completude fica pra página de detalhe.
  it('mais de 10: tooltip corta em 10 e adiciona linha "..."', () => {
    const names = Array.from({ length: 14 }, (_, i) => `Painel ${i + 1}`);
    const { container } = renderView([makeExam({ includedExams: names })]);

    const tooltip = dataCell(container, 3).querySelector('[role="tooltip"]')!;
    expect(tooltip.textContent).toContain('Painel 10');
    expect(tooltip.textContent).not.toContain('Painel 11');
    expect(tooltip.textContent).toMatch(/\.\.\.$/);
  });
});

describe('ExamResultsView — coluna Alterados', () => {
  it('sem alterações: badge verde', () => {
    const { container } = renderView([makeExam({ abnormalCount: 0 })]);

    expect(dataCell(container, 4).textContent).toBe('Sem alterações');
  });

  it.each([
    [1, '1 alterado'],
    [3, '3 alterados'],
  ])('%i fora da faixa: badge âmbar com contagem', (count, expected) => {
    const { container } = renderView([makeExam({ abnormalCount: count })]);

    expect(dataCell(container, 4).textContent).toBe(expected);
  });
});

describe('ExamResultsView — navegação pro detalhe', () => {
  it('clicar na linha navega pro exame', async () => {
    const { container } = renderView([makeExam({ testId: 'abc-123' })]);

    await userEvent.click(dataCell(container, 1));

    expect(push).toHaveBeenCalledWith('/resultados/abc-123');
  });

  it('o olhinho é um link pro mesmo destino (padrão das outras telas)', () => {
    renderView([makeExam({ testId: 'abc-123' })]);

    const eye = screen.getByLabelText('Ver resultado do exame');
    expect(eye).toHaveAttribute('href', '/resultados/abc-123');
  });
});

describe('ExamResultsView — card de histórico geral e estados', () => {
  it('card no topo leva pra /resultados/geral', () => {
    renderView([makeExam()]);

    expect(screen.getByText('Visualizar histórico geral').closest('a')).toHaveAttribute(
      'href',
      '/resultados/geral',
    );
  });

  it('sem exames: estado vazio com convite pra enviar', () => {
    renderView([]);

    expect(screen.getByText('Nenhum exame processado ainda')).toBeInTheDocument();
    expect(screen.getByText('Clique aqui para enviar exames').closest('a')).toHaveAttribute('href', '/home');
  });

  it('paginação navega preservando pageSize fora do default', async () => {
    renderView([makeExam()], { page: 2, pageSize: 10, totalCount: 25, totalPages: 3 });

    await userEvent.click(screen.getByTitle('Próxima página'));

    expect(push).toHaveBeenCalledWith('/resultados?page=3&pageSize=10');
  });
});
