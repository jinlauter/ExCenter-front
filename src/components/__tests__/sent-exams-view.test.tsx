import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// sortBy default = null porque é assim que a tela ABRE: sem cabeçalho clicado, a ordenação é a
// visão agrupada por status que o back monta (ver page.tsx). Testes de coluna específica passam
// sortBy explícito.
function renderView(
  files: SentFileResponse[],
  pageOverrides: Partial<SentFilesPageResponse> = {},
  viewProps: Partial<{ sortBy: string | null; sortDir: 'asc' | 'desc'; search: string }> = {},
) {
  return render(
    <SentExamsView
      data={makePage(files, pageOverrides)}
      sortBy={viewProps.sortBy ?? null}
      sortDir={viewProps.sortDir ?? 'desc'}
      search={viewProps.search ?? ''}
    />,
  );
}

// Colunas na ordem em que aparecem na tabela: Arquivo(0) Status(1) Data do exame(2)
// Médico solicitante(3) Enviado em(4) Processado em(5) Ações(6).
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
    async (status) => {
      const { container } = renderView([
        makeFile({ status, isValidExam: undefined, examDate: null, requestingDoctor: null }),
      ]);

      // As DUAS colunas extraídas por IA (data do exame + médico) têm o gatilho de tooltip.
      expect(dataCell(container, 2).querySelector('.cursor-help')).not.toBeNull();
      expect(dataCell(container, 3).querySelector('.cursor-help')).not.toBeNull();

      // O tooltip só monta no DOM durante o hover (ver ui/tooltip.tsx).
      await userEvent.hover(dataCell(container, 2).querySelector('.cursor-help')!);
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Ainda em processamento');
    },
  );

  it('done + exame válido + campos preenchidos: mostra os valores formatados', () => {
    const { container } = renderView([
      makeFile({ status: 'done', isValidExam: true, examDate: '2026-03-10T00:00:00Z', requestingDoctor: 'Dr. João Silva' }),
    ]);

    expect(dataCell(container, 2).textContent).toBe('10/03/2026');
    expect(dataCell(container, 3).textContent).toBe('Dr. João Silva');
  });

  // O nome vem inteiro do laudo e é a coluna que mais empurrava a largura da tabela. Corta na
  // exibição, mas o valor completo continua alcançável pelo tooltip — e o corte NÃO pode
  // alterar o dado, que é chave de agrupamento/ordenação no banco.
  it('médico com nome longo: corta na exibição e mostra o nome inteiro no tooltip', async () => {
    const { container } = renderView([
      makeFile({
        status: 'done',
        isValidExam: true,
        examDate: '2026-03-10T00:00:00Z',
        requestingDoctor: 'Luis Eduardo Agner Machado Martins',
      }),
    ]);

    const cell = dataCell(container, 3);
    expect(cell.textContent).toContain('Luis Eduardo Agner Mac...');

    // O tooltip só entra no DOM durante o hover (ver ui/tooltip.tsx) — pairar é parte do teste.
    await userEvent.hover(cell.querySelector('.cursor-help')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Luis Eduardo Agner Machado Martins');
  });

  it('médico com nome curto: exibe inteiro e sem tooltip (nada foi escondido)', () => {
    const { container } = renderView([
      makeFile({
        status: 'done',
        isValidExam: true,
        examDate: '2026-03-10T00:00:00Z',
        requestingDoctor: 'Marcela Robl',
      }),
    ]);

    const cell = dataCell(container, 3);
    expect(cell.textContent).toBe('Marcela Robl');
    expect(cell.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it('done + exame válido + campos vazios: mostra tooltip de "não foi possível extrair"', async () => {
    const { container } = renderView([
      makeFile({ status: 'done', isValidExam: true, examDate: null, requestingDoctor: null }),
    ]);

    expect(dataCell(container, 2).textContent).toContain('—');
    await userEvent.hover(dataCell(container, 2).querySelector('.cursor-help')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Não foi possível extrair essa informação do exame.');
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

  // Laudo válido cujo exame o usuário já tinha (mesmo conteúdo em outro arquivo): badge
  // própria e o motivo — frase pronta do back — no tooltip do ícone de info.
  it('laudo duplicado: badge "Laudo duplicado" com o motivo no tooltip', () => {
    const reason = 'Este laudo já existe na sua conta: é o exame de 20/01/2026, importado de outro arquivo.';
    renderView([makeFile({ status: 'duplicateexam', isValidExam: true, invalidReason: reason })]);

    expect(screen.getByText('Laudo duplicado')).toBeInTheDocument();
    expect(screen.getByTitle(reason)).toBeInTheDocument();
  });
});

// Guardas de regressão de layout. Assertar classe CSS normalmente é frágil, mas estes três
// casos vêm de defeitos reais vistos em tela: sem eles, a próxima refatoração de estilo
// reintroduz o bug sem ninguém perceber até alguém abrir a tela num celular.
describe('SentExamsView — layout em telas estreitas', () => {
  // "Não é exame de sangue" numa coluna espremida quebrava em 4 linhas, e o rounded-full
  // (raio 9999px) transformava a pílula numa elipse, esticando a linha da tabela pro dobro.
  it('badge de status nunca quebra linha', () => {
    const { container } = renderView([makeFile({ status: 'done', isValidExam: false, invalidReason: 'Conta de luz' })]);

    const badge = dataCell(container, 1).querySelector('span');
    expect(badge).toHaveClass('whitespace-nowrap');
    expect(badge).toHaveTextContent('Não é exame de sangue');
  });

  it('colunas de data não quebram linha', () => {
    const { container } = renderView([makeFile()]);

    expect(dataCell(container, 4)).toHaveClass('whitespace-nowrap'); // Enviado em
    expect(dataCell(container, 5)).toHaveClass('whitespace-nowrap'); // Processado em
  });

  it('coluna de médico não quebra linha', () => {
    const { container } = renderView([
      makeFile({ status: 'done', isValidExam: true, requestingDoctor: 'Luis Eduardo Agner Machado Martins' }),
    ]);

    expect(dataCell(container, 3)).toHaveClass('whitespace-nowrap');
  });
});

describe('SentExamsView — ordenação server-side via URL', () => {
  // A tela abre agrupada por status: nenhuma coluna aparece como ativa, e a URL fica sem
  // sortBy — é a AUSÊNCIA do parâmetro que o back lê como "visão inicial".
  it('sem cabeçalho clicado, nenhuma coluna aparece ordenada', () => {
    const { container } = renderView([makeFile()]);

    expect(container.querySelectorAll('thead svg')).toHaveLength(0);
  });

  it('clicar num cabeçalho inativo ordena por ele na direção default (texto asc)', async () => {
    renderView([makeFile()]);

    await userEvent.click(screen.getByRole('button', { name: 'Arquivo' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?sortBy=fileName&sortDir=asc');
  });

  it('clicar no cabeçalho ativo inverte a direção', async () => {
    renderView([makeFile()], {}, { sortBy: 'examDate', sortDir: 'desc' });

    await userEvent.click(screen.getByRole('button', { name: 'Data do exame' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?sortBy=examDate&sortDir=asc');
  });

  // Paginar/buscar dentro da visão agrupada não pode "inventar" um sortBy: se inventasse, a
  // simples troca de página trocaria silenciosamente a ordem da lista inteira.
  it('trocar de página na visão agrupada mantém a URL sem sortBy', async () => {
    renderView([makeFile()], { page: 1, totalCount: 45, totalPages: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?page=2');
  });

  it('paginar com coluna ordenada preserva a ordenação escolhida', async () => {
    renderView([makeFile()], { page: 1, totalCount: 45, totalPages: 3 }, { sortBy: 'fileName', sortDir: 'asc' });

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?page=2&sortBy=fileName&sortDir=asc');
  });

  it('trocar a ordenação volta pra página 1', async () => {
    renderView([makeFile()], { page: 3, totalPages: 5, totalCount: 90 });

    await userEvent.click(screen.getByRole('button', { name: 'Arquivo' }));

    // Sem "page=" na URL = página 1 (default omitido).
    expect(pushMock).toHaveBeenCalledWith('/exames-enviados?sortBy=fileName&sortDir=asc');
  });
});

describe('SentExamsView — paginação server-side via URL', () => {
  // Página cheia de verdade: o intervalo exibido conta as linhas realmente renderizadas, então
  // o teste precisa das 20 — com 1 item só, "21–40" seria uma afirmação falsa sobre a tela.
  it('mostra o intervalo visível e o total', () => {
    const paginaCheia = Array.from({ length: 20 }, (_, i) => makeFile({ fileId: `f-${i}` }));
    renderView(paginaCheia, { page: 2, pageSize: 20, totalCount: 45, totalPages: 3 });

    expect(screen.getByText('Mostrando 21–40 de 45')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('última página parcial mostra o intervalo real, não a página cheia', () => {
    const ultimaPagina = Array.from({ length: 5 }, (_, i) => makeFile({ fileId: `f-${i}` }));
    renderView(ultimaPagina, { page: 3, pageSize: 20, totalCount: 45, totalPages: 3 });

    expect(screen.getByText('Mostrando 41–45 de 45')).toBeInTheDocument();
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

describe('SentExamsView — exclusão de arquivo', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('abrir a confirmação NÃO exclui nada', async () => {
    renderView([makeFile()]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('"Não" fecha a confirmação sem excluir', async () => {
    renderView([makeFile({ status: 'failed', isValidExam: undefined })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Não' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  // Exame processado é o único caso com resultado extraído pra perder junto — e o único com
  // contador de espera. O botão nasce travado mostrando a contagem.
  it('exame concluído e válido: título de exame e "Sim" travado pelo contador', async () => {
    renderView([makeFile({ status: 'done', isValidExam: true })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));

    expect(screen.getByText('Excluir este exame?')).toBeInTheDocument();
    expect(screen.getByText(/resultados extraídos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sim \(\d\)$/ })).toBeDisabled();
  });

  // O contador em si (zerar e liberar o botão) é testado em ui/__tests__/confirm-dialog.test.tsx
  // — lá, isolado, dá pra usar fake timers sem contaminar os outros testes deste arquivo.

  // Sem exame processado por trás, não há o que "perder" além do próprio arquivo: mensagem
  // curta e "Sim" liberado de cara.
  it.each([
    ['failed', undefined],
    ['pending', undefined],
  ])('status=%s: confirmação simples, sem contador', async (status, isValidExam) => {
    renderView([makeFile({ status, isValidExam })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));

    expect(screen.getByText('Excluir este arquivo?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sim' })).toBeEnabled();
  });

  it('arquivo que não é exame: mostra o que o sistema entendeu que ele é', async () => {
    renderView([makeFile({ status: 'done', isValidExam: false, invalidReason: 'Conta de luz da Energisa' })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));

    expect(screen.getByText('Excluir este arquivo?')).toBeInTheDocument();
    expect(screen.getByText(/Conta de luz da Energisa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sim' })).toBeEnabled();
  });

  it('confirmar chama DELETE e atualiza a lista', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 204 } as Response);
    renderView([makeFile({ fileId: 'abc-123', status: 'failed', isValidExam: undefined })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(fetch).toHaveBeenCalledWith('/api/bloodtests/files/abc-123', { method: 'DELETE' });
  });

  // O router.refresh() leva ~2s pra trazer a página nova do servidor. A linha não pode ficar
  // visível nesse intervalo: o usuário acabou de mandar excluir e acharia que falhou.
  it('a linha some na hora, sem esperar os dados novos do servidor', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 204 } as Response);
    renderView([
      makeFile({ fileId: 'a', fileName: 'apagar.pdf', status: 'failed', isValidExam: undefined }),
      makeFile({ fileId: 'b', fileName: 'manter.pdf', status: 'failed', isValidExam: undefined }),
    ]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Excluir arquivo' })[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    // As props ainda trazem os 2 arquivos (o servidor não respondeu de novo), mas a linha
    // excluída já não é renderizada.
    await waitFor(() => expect(screen.queryByText('apagar.pdf')).not.toBeInTheDocument());
    expect(screen.getByText('manter.pdf')).toBeInTheDocument();
  });

  it('mostra confirmação nomeando o arquivo excluído', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 204 } as Response);
    renderView([makeFile({ fileName: 'laudo-antigo.pdf', status: 'failed', isValidExam: undefined })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('"laudo-antigo.pdf" foi excluído.')).toBeInTheDocument();
  });

  // Sem isso o rodapé diria "de 2" com uma linha só na tela, e o usuário duvidaria do que viu.
  it('as contagens acompanham a remoção imediata', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 204 } as Response);
    renderView(
      [
        makeFile({ fileId: 'a', status: 'failed', isValidExam: undefined }),
        makeFile({ fileId: 'b', status: 'failed', isValidExam: undefined }),
      ],
      { totalCount: 2, totalPages: 1 },
    );

    expect(screen.getByText('Mostrando 1–2 de 2')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Excluir arquivo' })[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('erro do back não remove a linha da tela', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 409,
      json: async () => ({ message: 'Este arquivo está sendo processado.' }),
    } as Response);
    renderView([makeFile({ fileName: 'continua.pdf', status: 'pending', isValidExam: undefined })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText(/Este arquivo está sendo processado/)).toBeInTheDocument();
    expect(screen.getByText('continua.pdf')).toBeInTheDocument();
  });

  // O 409 do back precisa chegar legível: é o caso em que o worker pegou o arquivo entre o
  // clique e a requisição, e o usuário só precisa tentar de novo depois.
  it('recusa do back aparece pro usuário e a confirmação fecha', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 409,
      json: async () => ({ message: 'Este arquivo está sendo processado. Aguarde o processamento terminar para excluí-lo.' }),
    } as Response);
    renderView([makeFile({ status: 'pending', isValidExam: undefined })]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText(/Este arquivo está sendo processado/)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // Regra espelhada no back (409): enquanto o worker pode estar com o arquivo, excluir criaria
  // um exame órfão no Histórico.
  it.each(['processing', 'retrying'])('status=%s: lixeira desabilitada com explicação', async (status) => {
    renderView([makeFile({ status, isValidExam: undefined })]);

    const trash = screen.getByRole('button', { name: 'Excluir arquivo' });
    expect(trash).toBeDisabled();

    // A explicação mora num tooltip, que só monta no hover (o wrapper captura o hover
    // mesmo com o botão desabilitado — é o motivo de o Tooltip envolver o botão).
    await userEvent.hover(trash.parentElement!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      /Não é possível excluir enquanto o exame está sendo processado/,
    );

    await userEvent.click(trash);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // Apagar o último item de uma página interna deixaria o usuário olhando pra uma página vazia.
  it('excluir o último item de uma página interna volta uma página', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 204 } as Response);
    renderView([makeFile({ status: 'failed', isValidExam: undefined })], {
      page: 3,
      totalCount: 41,
      totalPages: 3,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir arquivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/exames-enviados?page=2'));
  });
});

// Mesma pista de rolagem da tela de resultados: min-w-[900px] dentro de overflow-x-auto rola,
// mas sem barra permanente nada indica que a tabela continua à direita no celular.
describe('SentExamsView — pista de rolagem lateral no celular', () => {
  it('o container que rola tem a barra de rolagem sempre visível', () => {
    const { container } = renderView([makeFile()]);

    const containerQueRola = container.querySelector('.overflow-x-auto');

    expect(containerQueRola).not.toBeNull();
    expect(containerQueRola).toHaveClass('horizontal-scroll-visible');
  });
});
