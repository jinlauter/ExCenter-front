import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamDetailView } from '@/components/exam-detail-view';
import type { ExamDetailResponse, ExamDetailResult } from '@/types/api';

const push = vi.fn();

// BackLink usa useRouter — sem o mock, o React lança "app router to be mounted".
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function makeResult(overrides: Partial<ExamDetailResult> = {}): ExamDetailResult {
  return {
    resultId: crypto.randomUUID(),
    parameterName: 'Hemoglobina',
    numericResultValue: 14.6,
    unit: 'g/dL',
    referenceValue: '13,0 a 17,0',
    isAbnormal: false,
    history: [],
    ...overrides,
  };
}

function makeExam(overrides: Partial<ExamDetailResponse> = {}): ExamDetailResponse {
  return {
    testId: 'test-1',
    examDate: '2025-08-02T00:00:00Z',
    requestingDoctor: 'Jean Rodrigo Tafarel',
    laboratoryName: 'FRISCHMANN AISENGART',
    abnormalCount: 0,
    resultCount: 1,
    groups: [{ name: 'Hemograma', isSingle: false, material: 'Sangue Total', method: 'Impedância', results: [makeResult()] }],
    ...overrides,
  };
}

describe('ExamDetailView — cabeçalho do laudo', () => {
  it('mostra data por extenso, médico, laboratório e o balanço de alterados', () => {
    render(<ExamDetailView exam={makeExam({ abnormalCount: 3, resultCount: 25 })} />);

    expect(screen.getByText('02 de agosto de 2025')).toBeInTheDocument();
    expect(screen.getByText('Jean Rodrigo Tafarel')).toBeInTheDocument();
    expect(screen.getByText('FRISCHMANN AISENGART')).toBeInTheDocument();
    expect(screen.getByText('3 de 25 fora da faixa')).toBeInTheDocument();
  });

  it('sem alterações: badge verde', () => {
    render(<ExamDetailView exam={makeExam({ abnormalCount: 0 })} />);

    expect(screen.getByText('Sem alterações')).toBeInTheDocument();
  });

  it('campos não extraídos mostram "—"', () => {
    render(<ExamDetailView exam={makeExam({ examDate: null, requestingDoctor: null, laboratoryName: null })} />);

    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  // Voltar é um BackLink (botão com estado de pendência), não <Link> — o destino é
  // renderizado no servidor e precisa dar feedback no clique.
  it('voltar navega pra lista de resultados', async () => {
    render(<ExamDetailView exam={makeExam()} />);

    await userEvent.click(screen.getByText('Voltar para Resultado de exames'));

    expect(push).toHaveBeenCalledWith('/resultados');
  });
});

describe('ExamDetailView — painéis e linhas', () => {
  it('painel mostra nome, material e método; linhas mostram parâmetro, valor pt-BR e referência', () => {
    render(<ExamDetailView exam={makeExam()} />);

    expect(screen.getByText('Hemograma')).toBeInTheDocument();
    expect(screen.getByText('Material: Sangue Total · Método: Impedância')).toBeInTheDocument();
    expect(screen.getByText('Hemoglobina')).toBeInTheDocument();
    expect(screen.getByText('14,6 g/dL')).toBeInTheDocument(); // vírgula, como no laudo
    expect(screen.getByText('Referência: 13,0 a 17,0')).toBeInTheDocument();
  });

  // Exame avulso: o nome é o título do card — repetir na linha seria eco.
  it('exame avulso não repete o nome na linha', () => {
    render(
      <ExamDetailView
        exam={makeExam({
          groups: [
            {
              name: 'Ferritina',
              isSingle: true,
              material: 'Soro',
              method: null,
              results: [makeResult({ parameterName: 'Ferritina', numericResultValue: 233.3, unit: 'ng/mL' })],
            },
          ],
        })}
      />,
    );

    expect(screen.getAllByText('Ferritina')).toHaveLength(1); // só o título do card
    expect(screen.getByText('Material: Soro')).toBeInTheDocument();
  });

  it('resultado fora da faixa ganha badge e valor em destaque', () => {
    render(
      <ExamDetailView
        exam={makeExam({
          groups: [
            {
              name: 'Ferritina',
              isSingle: true,
              material: null,
              method: null,
              results: [makeResult({ parameterName: 'Ferritina', numericResultValue: 500, unit: 'ng/mL', isAbnormal: true })],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('Fora da faixa')).toBeInTheDocument();
  });

  it('resultado qualitativo mostra o texto no lugar do número', () => {
    render(
      <ExamDetailView
        exam={makeExam({
          groups: [
            {
              name: 'HIV',
              isSingle: true,
              material: null,
              method: null,
              results: [
                makeResult({ parameterName: 'HIV', numericResultValue: null, stringResultValue: 'Não reagente', unit: null, referenceValue: null }),
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('Não reagente')).toBeInTheDocument();
  });
});

describe('ExamDetailView — gráfico de histórico por parâmetro', () => {
  const history = [
    { date: '2024-01-10T00:00:00Z', value: 14.1, referenceValue: '13,0 a 17,0' },
    { date: '2025-08-02T00:00:00Z', value: 14.6, referenceValue: '13,0 a 17,0' },
  ];

  it('com 2+ pontos: botão "Histórico" abre e fecha o gráfico', async () => {
    const { container } = render(
      <ExamDetailView exam={makeExam({ groups: [{ name: 'Hemograma', isSingle: false, material: null, method: null, results: [makeResult({ history })] }] })} />,
    );

    const btn = screen.getByRole('button', { name: /Histórico/ });
    // seletor pelo viewBox DO TrendChart — svg genérico casaria com qualquer ícone lucide
    expect(container.querySelector('svg[viewBox="0 0 680 260"]')).toBeNull(); // retraído por padrão

    await userEvent.click(btn);
    expect(container.querySelector('svg[viewBox="0 0 680 260"]')).not.toBeNull(); // TrendChart montado

    await userEvent.click(btn);
    expect(container.querySelector('svg[viewBox="0 0 680 260"]')).toBeNull();
  });

  // 1 ponto não é evolução — é o próprio valor, que já está na linha.
  it('com menos de 2 pontos não há botão de histórico', () => {
    render(
      <ExamDetailView
        exam={makeExam({
          groups: [
            { name: 'Hemograma', isSingle: false, material: null, method: null, results: [makeResult({ history: [history[0]!] })] },
          ],
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: /Histórico/ })).not.toBeInTheDocument();
  });
});
