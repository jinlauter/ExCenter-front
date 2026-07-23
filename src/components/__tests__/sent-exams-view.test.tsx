import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SentExamsView } from '@/components/sent-exams-view';
import type { SentFileResponse, SentFilesPageResponse } from '@/types/api';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: pushMock }),
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

function makePage(
  files: SentFileResponse[],
  overrides: Partial<SentFilesPageResponse> = {},
): SentFilesPageResponse {
  return {
    items: files,
    page: 1,
    pageSize: 20,
    totalCount: files.length,
    totalPages: files.length > 0 ? 1 : 0,
    ...overrides,
  };
}

function renderView(
  files: SentFileResponse[],
  pageOverrides: Partial<SentFilesPageResponse> = {},
  viewProps: Partial<{ sortBy: string; sortDir: 'asc' | 'desc'; search: string }> = {},
) {
  return render(
    <SentExamsView
      data={makePage(files, pageOverrides)}
      sortBy={viewProps.sortBy ?? 'examDate'}
      sortDir={viewProps.sortDir ?? 'desc'}
      search={viewProps.search ?? ''}
    />,
  );
}

// Colunas na ordem em que aparecem na tabela: Arquivo(0) Status(1) Data do exame(2)
// Médico solicitante(3) Enviado em(4) Processado em(5) Download(6).
function dataCell(container: HTMLElement, columnIndex: number) {
  const row = container.querySelector('tbody tr')!;
  return row.children[columnIndex] as HTMLElement;
}

beforeEach(() => {
  pushMock.mockClear();
});

describe('SentExamsView — colunas de data do exame e médico solicitante', () => {
  it.each(['pending', 'processing', 'retrying'])(
    'status=%s sem valor: mostra tooltip de "ainda em processamento"',
    (status) => {
      const { container } = renderView([
        makeFile({ status, isValidExam: undefined, examDate: null, requestingDoctor: null }),
      ]);

      expect(dataCell(container, 2).textContent).toContain('—');
      expect(
        screen.getAllByText('Ainda em processamento — se essa informação estiver no exame, será preenchida automaticamente.'),
      ).toHaveLength(2); // uma pra cada coluna (data do exame + médico solicitante)
    },
  );

  it('done + exame válido + campos preenchidos: mostra os valores formatados', () => {
    const { container } = renderView([
      makeFile({ status: 'done', isValidExam: true, examDate: '2026-03-10T00:00:00Z', requestingDoctor: 'Dr. João Silva' }),
    ]);

    expect(dataCell(container, 2).textContent).toBe('10/03/2026');
    expect(dataCell(container, 3).textContent).toBe('Dr. João Silva');
  });

  it('done + exame válido + campos vazios: mostra tooltip de "não foi possível extrair"', () => {
    const { container } = renderView([
      makeFile({ status: 'done', isValidExam: true, examDate: null, requestingDoctor: null }),
    ]);

    expect(dataCell(container, 2).textContent).toContain('—');
    expect(screen.getAllByText('Não foi possível extrair essa informação do exame.')).toHaveLength(2);
  });

  it('status=failed: colunas ficam em branco, sem tooltip', () => {
    const { container } = renderView([
      makeFile({ status: 'failed', isValidExam: undefined, examDate: null, requestingDoctor: null }),
    ]);

    expect(dataCell(container, 2).textContent).toBe('');
    expect(dataCell(container, 3).textContent).toBe('');
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it('done + não é exame de sangue (isValidExam=false): colunas ficam em branco', () => {
    const { container } = renderView([
      makeFile({ status: 'done', isValidExam: false, invalidReason: 'Conta de luz' }),
    ]);

    expect(dataCell(container, 2).textContent).toBe('');
    expect(dataCell(container, 3).textContent).toBe('');
  });
});

describe('SentExamsView — ordenação server-side via URL', () => {
  it('clicar num cabeçalho inativo ordena por ele na direção default (texto asc)', async () => {
    renderView([makeFile()]);

    await userEvent.click(screen.getByRole('button', { name: 'Arquivo' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?sortBy=fileName&sortDir=asc');
  });

  it('clicar no cabeçalho ativo inverte a direção', async () => {
    renderView([makeFile()]); // ativo = examDate desc (default)

    await userEvent.click(screen.getByRole('button', { name: 'Data do exame' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?sortBy=examDate&sortDir=asc');
  });

  it('trocar a ordenação volta pra página 1', async () => {
    renderView([makeFile()], { page: 3, totalPages: 5, totalCount: 90 });

    await userEvent.click(screen.getByRole('button', { name: 'Arquivo' }));

    // Sem "page=" na URL = página 1 (default omitido).
    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?sortBy=fileName&sortDir=asc');
  });
});

describe('SentExamsView — paginação server-side via URL', () => {
  it('mostra o intervalo visível e o total', () => {
    renderView([makeFile()], { page: 2, pageSize: 20, totalCount: 45, totalPages: 3 });

    expect(screen.getByText('Mostrando 21–40 de 45')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('próxima página empurra page+1 na URL', async () => {
    renderView([makeFile()], { page: 1, totalCount: 45, totalPages: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?page=2');
  });

  it('botões respeitam os limites (anterior desabilitado na 1ª, próxima na última)', () => {
    renderView([makeFile()], { page: 3, totalCount: 45, totalPages: 3 });

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });

  it('busca sem resultado mostra o estado vazio de busca (não o de "nunca enviou")', () => {
    renderView([], { totalCount: 0, totalPages: 0 }, { search: 'xyz' });

    expect(screen.getByText('Nenhum arquivo encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum exame enviado ainda')).not.toBeInTheDocument();
  });

  it('sem nenhum arquivo e sem busca mostra o convite de primeiro envio', () => {
    renderView([], { totalCount: 0, totalPages: 0 });

    expect(screen.getByText('Nenhum exame enviado ainda')).toBeInTheDocument();
    expect(screen.queryByText('Tem mais exames pra enviar?')).not.toBeInTheDocument();
  });
});

describe('SentExamsView — visualização do arquivo (olhinho)', () => {
  it('não mostra o modal antes de clicar no olho', () => {
    renderView([makeFile()]);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicar no olho abre o modal com o arquivo certo', async () => {
    const user = userEvent.setup();
    renderView([makeFile({ fileName: 'laudo.pdf' })]);

    await user.click(screen.getByRole('button', { name: 'Visualizar arquivo' }));

    expect(screen.getByRole('dialog', { name: 'Visualizando laudo.pdf' })).toBeInTheDocument();
  });

  it('fechar o modal (X) remove ele da tela', async () => {
    const user = userEvent.setup();
    renderView([makeFile({ fileName: 'laudo.pdf' })]);

    await user.click(screen.getByRole('button', { name: 'Visualizar arquivo' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o olho está disponível independente do status (arquivo já existe no storage assim que enviado)', () => {
    renderView([makeFile({ status: 'pending', isValidExam: undefined })]);

    expect(screen.getByRole('button', { name: 'Visualizar arquivo' })).toBeInTheDocument();
  });
});
