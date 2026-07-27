import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryView } from '@/components/history-view';
import type { BloodTestResultQueryResponse } from '@/types/api';

// Dois exames com 3 parâmetros em comum → 3 séries "trendable" (2+ pontos cada).
function makeResults(): BloodTestResultQueryResponse[] {
  const exams = [
    { testId: 't1', testDate: '2025-01-10T00:00:00Z' },
    { testId: 't2', testDate: '2026-01-10T00:00:00Z' },
  ];
  const params = [
    { name: 'Hemoglobina', unit: 'g/dL', values: [14.1, 14.6] },
    { name: 'Ferritina', unit: 'ng/mL', values: [180, 233] },
    { name: 'Glicose', unit: 'mg/dL', values: [88, 92] },
  ];
  return exams.flatMap((exam, i) =>
    params.map((p) => ({
      resultId: `${exam.testId}-${p.name}`,
      testId: exam.testId,
      patientName: 'Test',
      testDate: exam.testDate,
      parameterName: p.name,
      numericResultValue: p.values[i]!,
      unit: p.unit,
      referenceValue: null,
    })),
  );
}

function chartsRendered() {
  // Cada TrendChart é um <svg> com role img (via aria) ou figura — o seletor estável aqui é
  // o heading h3 que a HistoryView põe acima de cada gráfico selecionado.
  return screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
}

async function openDropdown() {
  await userEvent.click(screen.getByRole('button', { expanded: false }));
}

describe('HistoryView — seleção de até 3 parâmetros', () => {
  it('começa com o primeiro parâmetro selecionado e um gráfico', () => {
    render(<HistoryView results={makeResults()} />);

    expect(chartsRendered()).toEqual(['Hemoglobina']);
    expect(screen.getByText(/1 de 3 em uso/)).toBeInTheDocument();
  });

  it('selecionar mais parâmetros empilha um gráfico por seleção, na ordem escolhida', async () => {
    render(<HistoryView results={makeResults()} />);

    await openDropdown();
    const listbox = screen.getByRole('listbox');
    await userEvent.click(within(listbox).getByText('Glicose'));
    await userEvent.click(within(listbox).getByText('Ferritina'));

    expect(chartsRendered()).toEqual(['Hemoglobina', 'Glicose', 'Ferritina']);
    expect(screen.getByText(/3 de 3 em uso/)).toBeInTheDocument();
  });

  it('com 3 selecionados, as opções restantes desabilitam (aviso do teto)', async () => {
    // 4º parâmetro pra sobrar um desabilitado quando 3 estiverem marcados.
    const results = [
      ...makeResults(),
      ...['t1', 't2'].map((testId, i) => ({
        resultId: `${testId}-TSH`,
        testId,
        patientName: 'Test',
        testDate: i === 0 ? '2025-01-10T00:00:00Z' : '2026-01-10T00:00:00Z',
        parameterName: 'TSH',
        numericResultValue: 2 + i,
        unit: 'µUI/mL',
        referenceValue: null,
      })),
    ];
    render(<HistoryView results={results} />);

    await openDropdown();
    const listbox = screen.getByRole('listbox');
    await userEvent.click(within(listbox).getByText('Glicose'));
    await userEvent.click(within(listbox).getByText('Ferritina'));

    const tshOption = within(listbox).getByText('TSH').closest('button')!;
    expect(tshOption).toBeDisabled();
    expect(tshOption.title).toMatch(/Máximo de 3/);
  });

  it('desmarcar um parâmetro remove o gráfico dele e libera a seleção', async () => {
    render(<HistoryView results={makeResults()} />);

    await openDropdown();
    const listbox = screen.getByRole('listbox');
    await userEvent.click(within(listbox).getByText('Glicose'));
    await userEvent.click(within(listbox).getByText('Hemoglobina')); // desmarca a default

    expect(chartsRendered()).toEqual(['Glicose']);
    expect(screen.getByText(/1 de 3 em uso/)).toBeInTheDocument();
  });

  it('filtro do dropdown estreita a lista de opções', async () => {
    render(<HistoryView results={makeResults()} />);

    await openDropdown();
    await userEvent.type(screen.getByPlaceholderText('Filtrar parâmetros...'), 'ferri');

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Ferritina')).toBeInTheDocument();
    expect(within(listbox).queryByText('Glicose')).not.toBeInTheDocument();
  });
});
