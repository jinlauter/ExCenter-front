import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SentExamsView } from '@/components/sent-exams-view';
import type { SentFileResponse } from '@/types/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

function makeFile(overrides: Partial<SentFileResponse> = {}): SentFileResponse {
  return {
    fileId: 'file-1',
    batchId: 'batch-1',
    fileName: 'exame.pdf',
    status: 'done',
    sentAt: '2026-01-01T00:00:00Z',
    isValidExam: true,
    ...overrides,
  };
}

// Colunas na ordem em que aparecem na tabela: Arquivo(0) Status(1) Data do exame(2)
// Médico solicitante(3) Enviado em(4) Processado em(5) Download(6).
function dataCell(container: HTMLElement, columnIndex: number) {
  const row = container.querySelector('tbody tr')!;
  return row.children[columnIndex] as HTMLElement;
}

describe('SentExamsView — colunas de data do exame e médico solicitante', () => {
  it.each(['pending', 'processing', 'retrying'])(
    'status=%s sem valor: mostra tooltip de "ainda em processamento"',
    (status) => {
      const { container } = render(
        <SentExamsView files={[makeFile({ status, isValidExam: undefined, examDate: null, requestingDoctor: null })]} />,
      );

      expect(dataCell(container, 2).textContent).toContain('—');
      expect(
        screen.getAllByText('Ainda em processamento — se essa informação estiver no exame, será preenchida automaticamente.'),
      ).toHaveLength(2); // uma pra cada coluna (data do exame + médico solicitante)
    },
  );

  it('done + exame válido + campos preenchidos: mostra os valores formatados', () => {
    const { container } = render(
      <SentExamsView
        files={[makeFile({ status: 'done', isValidExam: true, examDate: '2026-03-10T00:00:00Z', requestingDoctor: 'Dr. João Silva' })]}
      />,
    );

    expect(dataCell(container, 2).textContent).toBe('10/03/2026');
    expect(dataCell(container, 3).textContent).toBe('Dr. João Silva');
  });

  it('done + exame válido + campos vazios: mostra tooltip de "não foi possível extrair"', () => {
    const { container } = render(
      <SentExamsView files={[makeFile({ status: 'done', isValidExam: true, examDate: null, requestingDoctor: null })]} />,
    );

    expect(dataCell(container, 2).textContent).toContain('—');
    expect(screen.getAllByText('Não foi possível extrair essa informação do exame.')).toHaveLength(2);
  });

  it('status=failed: colunas ficam em branco, sem tooltip', () => {
    const { container } = render(
      <SentExamsView files={[makeFile({ status: 'failed', isValidExam: undefined, examDate: null, requestingDoctor: null })]} />,
    );

    expect(dataCell(container, 2).textContent).toBe('');
    expect(dataCell(container, 3).textContent).toBe('');
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it('done + não é exame de sangue (isValidExam=false): colunas ficam em branco', () => {
    const { container } = render(
      <SentExamsView files={[makeFile({ status: 'done', isValidExam: false, invalidReason: 'Conta de luz' })]} />,
    );

    expect(dataCell(container, 2).textContent).toBe('');
    expect(dataCell(container, 3).textContent).toBe('');
  });
});

describe('SentExamsView — ordenação (data do exame desc, médico asc, envio asc)', () => {
  function fileNames(container: HTMLElement) {
    return [...container.querySelectorAll('tbody tr')].map(
      (row) => (row.children[0] as HTMLElement).title,
    );
  }

  it('ordena por data do exame decrescente', () => {
    const { container } = render(
      <SentExamsView
        files={[
          makeFile({ fileId: '1', fileName: 'antigo.pdf', examDate: '2024-01-01T00:00:00Z' }),
          makeFile({ fileId: '2', fileName: 'recente.pdf', examDate: '2026-01-01T00:00:00Z' }),
          makeFile({ fileId: '3', fileName: 'meio.pdf', examDate: '2025-01-01T00:00:00Z' }),
        ]}
      />,
    );

    expect(fileNames(container)).toEqual(['recente.pdf', 'meio.pdf', 'antigo.pdf']);
  });

  it('arquivos sem data do exame vão para o final', () => {
    const { container } = render(
      <SentExamsView
        files={[
          makeFile({ fileId: '1', fileName: 'sem-data.pdf', examDate: null, status: 'pending', isValidExam: undefined }),
          makeFile({ fileId: '2', fileName: 'com-data.pdf', examDate: '2026-01-01T00:00:00Z' }),
        ]}
      />,
    );

    expect(fileNames(container)).toEqual(['com-data.pdf', 'sem-data.pdf']);
  });

  it('empate na data do exame desempata por médico solicitante ascendente', () => {
    const { container } = render(
      <SentExamsView
        files={[
          makeFile({ fileId: '1', fileName: 'zeca.pdf', examDate: '2026-01-01T00:00:00Z', requestingDoctor: 'Dr. Zeca' }),
          makeFile({ fileId: '2', fileName: 'ana.pdf', examDate: '2026-01-01T00:00:00Z', requestingDoctor: 'Dr. Ana' }),
        ]}
      />,
    );

    expect(fileNames(container)).toEqual(['ana.pdf', 'zeca.pdf']);
  });

  it('empate em data do exame e médico desempata por data de envio ascendente', () => {
    const { container } = render(
      <SentExamsView
        files={[
          makeFile({ fileId: '1', fileName: 'enviado-depois.pdf', examDate: '2026-01-01T00:00:00Z', requestingDoctor: 'Dr. X', sentAt: '2026-02-01T00:00:00Z' }),
          makeFile({ fileId: '2', fileName: 'enviado-antes.pdf', examDate: '2026-01-01T00:00:00Z', requestingDoctor: 'Dr. X', sentAt: '2026-01-01T00:00:00Z' }),
        ]}
      />,
    );

    expect(fileNames(container)).toEqual(['enviado-antes.pdf', 'enviado-depois.pdf']);
  });
});

describe('SentExamsView — visualização do arquivo (olhinho)', () => {
  it('não mostra o modal antes de clicar no olho', () => {
    render(<SentExamsView files={[makeFile()]} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicar no olho abre o modal com o arquivo certo', async () => {
    const user = userEvent.setup();
    render(<SentExamsView files={[makeFile({ fileName: 'laudo.pdf' })]} />);

    await user.click(screen.getByRole('button', { name: 'Visualizar arquivo' }));

    expect(screen.getByRole('dialog', { name: 'Visualizando laudo.pdf' })).toBeInTheDocument();
  });

  it('fechar o modal (X) remove ele da tela', async () => {
    const user = userEvent.setup();
    render(<SentExamsView files={[makeFile({ fileName: 'laudo.pdf' })]} />);

    await user.click(screen.getByRole('button', { name: 'Visualizar arquivo' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o olho está disponível independente do status (arquivo já existe no storage assim que enviado)', () => {
    render(<SentExamsView files={[makeFile({ status: 'pending', isValidExam: undefined })]} />);

    expect(screen.getByRole('button', { name: 'Visualizar arquivo' })).toBeInTheDocument();
  });
});
