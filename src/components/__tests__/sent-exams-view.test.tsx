import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Colunas na ordem em que aparecem na tabela: Arquivo(0) Status(1) Enviado em(2)
// Processado em(3) Data do exame(4) Médico solicitante(5) Download(6).
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

      expect(dataCell(container, 4).textContent).toContain('—');
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

    expect(dataCell(container, 4).textContent).toBe('10/03/2026');
    expect(dataCell(container, 5).textContent).toBe('Dr. João Silva');
  });

  it('done + exame válido + campos vazios: mostra tooltip de "não foi possível extrair"', () => {
    const { container } = render(
      <SentExamsView files={[makeFile({ status: 'done', isValidExam: true, examDate: null, requestingDoctor: null })]} />,
    );

    expect(dataCell(container, 4).textContent).toContain('—');
    expect(screen.getAllByText('Não foi possível extrair essa informação do exame.')).toHaveLength(2);
  });

  it('status=failed: colunas ficam em branco, sem tooltip', () => {
    const { container } = render(
      <SentExamsView files={[makeFile({ status: 'failed', isValidExam: undefined, examDate: null, requestingDoctor: null })]} />,
    );

    expect(dataCell(container, 4).textContent).toBe('');
    expect(dataCell(container, 5).textContent).toBe('');
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it('done + não é exame de sangue (isValidExam=false): colunas ficam em branco', () => {
    const { container } = render(
      <SentExamsView files={[makeFile({ status: 'done', isValidExam: false, invalidReason: 'Conta de luz' })]} />,
    );

    expect(dataCell(container, 4).textContent).toBe('');
    expect(dataCell(container, 5).textContent).toBe('');
  });
});
