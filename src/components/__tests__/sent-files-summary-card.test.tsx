import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentFilesSummaryCard } from '@/components/sent-files-summary-card';
import type { SentFilesSummaryResponse } from '@/types/api';

function makeSummary(overrides: Partial<SentFilesSummaryResponse> = {}): SentFilesSummaryResponse {
  return {
    total: 0,
    pending: 0,
    processing: 0,
    retrying: 0,
    failed: 0,
    done: 0,
    notExam: 0,
    ...overrides,
  };
}

describe('SentFilesSummaryCard', () => {
  // O card fala em ARQUIVOS: nem todo arquivo enviado vira exame, e chamar tudo de "exame"
  // fazia o número não bater com a tela de resultados.
  it('mostra o total de arquivos, com singular/plural correto', () => {
    const { rerender } = render(<SentFilesSummaryCard summary={makeSummary({ total: 10, done: 10 })} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Arquivos enviados')).toBeInTheDocument();

    rerender(<SentFilesSummaryCard summary={makeSummary({ total: 1, done: 1 })} />);
    expect(screen.getByText('Arquivo enviado')).toBeInTheDocument();
  });

  it('exibe uma badge por status com contagem', () => {
    render(
      <SentFilesSummaryCard
        summary={makeSummary({ total: 21, pending: 2, processing: 1, retrying: 3, failed: 4, done: 5, notExam: 6 })}
      />,
    );

    expect(screen.getByText('2 Pendente')).toBeInTheDocument();
    expect(screen.getByText('1 Processando')).toBeInTheDocument();
    expect(screen.getByText('3 Tentando novamente')).toBeInTheDocument();
    expect(screen.getByText('4 Falhou')).toBeInTheDocument();
    expect(screen.getByText('6 Não é exame de sangue')).toBeInTheDocument();
    expect(screen.getByText('5 Concluído')).toBeInTheDocument();
  });

  // Regra pedida: status zerado não vira badge — fileira de zeros é ruído, e a ausência já
  // comunica "não tem nenhum nesse estado".
  it('omite status com contagem zero', () => {
    render(<SentFilesSummaryCard summary={makeSummary({ total: 7, done: 5, failed: 2 })} />);

    expect(screen.getByText('5 Concluído')).toBeInTheDocument();
    expect(screen.getByText('2 Falhou')).toBeInTheDocument();
    expect(screen.queryByText(/Pendente/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Processando/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Não é exame/)).not.toBeInTheDocument();
  });

  // Ordem: o que ainda precisa de atenção primeiro, resolvido por último — mesma lógica da
  // ordenação padrão da tabela de Exames enviados.
  it('ordena as badges por urgência, não pelo nome', () => {
    const { container } = render(
      <SentFilesSummaryCard summary={makeSummary({ total: 4, done: 1, failed: 1, pending: 1, notExam: 1 })} />,
    );

    const badges = [...container.querySelectorAll('.rounded-full')].map((b) => b.textContent);
    expect(badges).toEqual(['1 Pendente', '1 Falhou', '1 Não é exame de sangue', '1 Concluído']);
  });

  it('sem arquivo nenhum: mostra zero e nenhuma badge', () => {
    const { container } = render(<SentFilesSummaryCard summary={makeSummary()} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
  });
});
