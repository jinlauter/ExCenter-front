import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadCard } from '@/components/upload-card';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh }),
}));

// lastModified é derivado de nome+tamanho em vez de cair no Date.now() padrão do File: ele faz
// parte da identidade usada na deduplicação, e com o relógio dois makeFile('a.pdf', 1024) seriam
// arquivos DIFERENTES — o oposto do que "reselecionar o mesmo arquivo" quer dizer. No browser
// real esse campo é a data de modificação em disco, que não muda entre uma seleção e outra.
function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  return new File([new Uint8Array(sizeBytes)], name, { type, lastModified: name.length + sizeBytes });
}

// jsdom não implementa DataTransfer — define "files" diretamente como array-like
// (Array.from(event.target.files) no componente não exige um FileList "de verdade").
async function selectFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickEnviar() {
  fireEvent.click(screen.getByRole('button', { name: /^Enviar/ }));
}

describe('UploadCard — revisão antes do envio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    push.mockClear();
    refresh.mockClear();
  });

  it('mostra os limites visíveis pro usuário antes de selecionar', () => {
    render(<UploadCard />);

    expect(screen.getByText(/Até 20 arquivos por vez, 4 MB no total\./)).toBeInTheDocument();
  });

  it('mostra um quadradinho por arquivo selecionado, com nome e tamanho', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('exame1.pdf', 512 * 1024), makeFile('exame2.pdf', 2 * 1024 * 1024)]);

    expect(screen.getByText('exame1.pdf')).toBeInTheDocument();
    expect(screen.getByText('512 KB')).toBeInTheDocument();
    expect(screen.getByText('exame2.pdf')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
  });

  // Decisão de produto (24/08/2026): foto de laudo multi-folha quebra "arquivo = laudo" —
  // o envio por foto volta como fluxo próprio (grupo + portão), ver BACKLOG do back.
  it('recusa foto (JPG/PNG) avisando que o envio por foto chega em breve', async () => {
    render(<UploadCard />);

    await selectFiles([
      makeFile('exame.pdf', 1000, 'application/pdf'),
      makeFile('foto.jpg', 1000, 'image/jpeg'),
      makeFile('scan.png', 1000, 'image/png'),
    ]);

    expect(await screen.findByText(/envio por foto chega em breve/)).toBeInTheDocument();
    // O PDF válido da mesma seleção é mantido; as fotos são descartadas.
    expect(screen.getByText('1 de 20 arquivo selecionado')).toBeInTheDocument();
    expect(screen.queryByText('foto.jpg')).not.toBeInTheDocument();
  });

  it('recusa tipos sem relação com documento de exame (.exe, .mp3) e não os adiciona', async () => {
    render(<UploadCard />);

    await selectFiles([
      makeFile('exame.pdf', 1000, 'application/pdf'),
      makeFile('virus.exe', 1000, 'application/octet-stream'),
      makeFile('musica.mp3', 1000, 'audio/mpeg'),
    ]);

    expect(await screen.findByText(/Por enquanto aceitamos só PDF/)).toBeInTheDocument();
    expect(screen.getByText(/virus\.exe/)).toBeInTheDocument();
    // O PDF válido da mesma seleção é mantido; os inválidos são descartados.
    expect(screen.getByText('1 de 20 arquivo selecionado')).toBeInTheDocument();
    expect(screen.queryByText('virus.exe')).not.toBeInTheDocument();
  });

  it('mostra quantos arquivos e quanto do limite de tamanho a seleção consome', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1 * 1024 * 1024), makeFile('b.pdf', 1 * 1024 * 1024)]);

    expect(screen.getByText('2 de 20 arquivos selecionados')).toBeInTheDocument();
    expect(screen.getByText('2 MB de 4 MB')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('selecionar mais arquivos ACUMULA na seleção existente (não substitui)', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1024)]);
    await selectFiles([makeFile('b.pdf', 2048)]);

    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(screen.getByText('2 de 20 arquivos selecionados')).toBeInTheDocument();
  });

  it('não duplica o mesmo arquivo reselecionado (dedupe por nome+tamanho+data de modificação)', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1024)]);
    await selectFiles([makeFile('a.pdf', 1024), makeFile('b.pdf', 512)]);

    expect(screen.getByText('2 de 20 arquivos selecionados')).toBeInTheDocument();
  });

  it('mostra o quadrado "Selecionar mais" junto dos arquivos, sem o antigo "Trocar seleção"', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1024)]);

    expect(screen.getByRole('button', { name: /Selecionar mais/ })).toBeInTheDocument();
    expect(screen.queryByText('Trocar seleção')).not.toBeInTheDocument();
  });

  it('esconde o "Selecionar mais" quando a seleção atinge o limite de 20', async () => {
    render(<UploadCard />);

    await selectFiles(Array.from({ length: 20 }, (_, i) => makeFile(`exame${i}.pdf`, 1000)));

    expect(screen.queryByRole('button', { name: /Selecionar mais/ })).not.toBeInTheDocument();
  });

  it('remover um arquivo tira ele da seleção e atualiza a contagem', async () => {
    render(<UploadCard />);
    await selectFiles([makeFile('a.pdf', 1024), makeFile('b.pdf', 1024)]);

    fireEvent.click(screen.getByRole('button', { name: 'Remover a.pdf' }));

    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 20 arquivo selecionado')).toBeInTheDocument();
  });

  it('cancelar limpa a seleção e volta pra tela inicial', async () => {
    render(<UploadCard />);
    await selectFiles([makeFile('a.pdf', 1024)]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText(/Até 20 arquivos por vez, 4 MB no total\./)).toBeInTheDocument();
    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
  });

  it('bloqueia o envio (mas mantém a seleção visível pra remover arquivos) quando passa de 20', async () => {
    render(<UploadCard />);

    const files = Array.from({ length: 21 }, (_, i) => makeFile(`exame${i}.pdf`, 1000));
    await selectFiles(files);

    expect(await screen.findByText('Envie no máximo 20 arquivos por vez. Você selecionou 21.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Enviar/ })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('permite exatamente 20 arquivos pequenos (não bloqueia por contagem)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 20, duplicateCount: 0, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    const files = Array.from({ length: 20 }, (_, i) => makeFile(`exame${i}.pdf`, 1000));
    await selectFiles(files);
    clickEnviar();

    expect(await screen.findByText(/20 arquivos enviados/)).toBeInTheDocument();
  });

  // O card de resumo da home é renderizado no servidor: sem o refresh, o contador só mudava
  // quando o usuário recarregava a página na mão.
  it('sucesso: pede refresh pra home reexibir a contagem nova', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 2, duplicateCount: 0, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000)]);
    clickEnviar();

    await screen.findByText(/2 arquivos enviados/);
    expect(refresh).toHaveBeenCalled();
  });

  it('erro no envio: NÃO pede refresh (contagem não mudou)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Arquivo inválido.' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000)]);
    clickEnviar();

    await screen.findByText('Arquivo inválido.');
    expect(refresh).not.toHaveBeenCalled();
  });

  // "Ver agora" leva pra uma página renderizada no servidor (1-2s de espera) — sem feedback
  // imediato no clique, parecia clique perdido e o usuário clicava de novo.
  it('sucesso: "Ver agora" navega e mostra estado de carregamento no próprio clique', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 1, duplicateCount: 0, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('exame.pdf', 1000)]);
    clickEnviar();

    const verAgora = await screen.findByRole('button', { name: 'Ver agora' });
    fireEvent.click(verAgora);

    expect(push).toHaveBeenCalledWith('/exames-enviados');
  });

  it('bloqueia o envio quando o total passa de 4MB, sem chamar a API', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('grande.pdf', 5 * 1024 * 1024)]);

    expect(await screen.findByText(/passa do limite de 4 MB por envio/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Enviar/ })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('permite quando o total está exatamente dentro do limite', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 1, duplicateCount: 0, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('exato.pdf', 4 * 1024 * 1024)]);
    clickEnviar();

    expect(await screen.findByText(/1 arquivo enviado\./)).toBeInTheDocument();
  });

  // ── Duplicatas (detectadas pelo back via hash de conteúdo) ─────────────────
  //
  // Envio com duplicata é um desfecho DIFERENTE de sucesso: antes os dois caíam no mesmo alerta
  // verde e o aviso da duplicata passava batido. O alerta agora é âmbar, o que não entrou vira
  // título, e os nomes dos arquivos barrados são listados.

  it('quando parte dos arquivos já existia: alerta âmbar, título do que não entrou e o nome do arquivo', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        batchId: 'b1',
        fileCount: 2,
        duplicateFileNames: ['c.pdf'],
        duplicateCount: 1,
        message: 'ok',
      }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000), makeFile('c.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByText('1 arquivo não foi enviado')).toBeInTheDocument();
    expect(screen.getByText(/2 arquivos de 3 foram enviados/)).toBeInTheDocument();
    expect(screen.getByText('c.pdf')).toBeInTheDocument();
    // Cor: o alerta não pode continuar verde de sucesso.
    expect(screen.getByRole('alert').className).toContain('amber');
  });

  it('quando todos os arquivos já existiam: título diz que nenhum entrou e lista os dois nomes', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        batchId: null,
        fileCount: 0,
        duplicateFileNames: ['a.pdf', 'b.pdf'],
        duplicateCount: 2,
        message: 'ok',
      }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByText('Nenhum arquivo foi enviado')).toBeInTheDocument();
    expect(
      screen.getByText(/Todos os arquivos selecionados já haviam sido enviados e processados anteriormente/),
    ).toBeInTheDocument();
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  // Nada entrou na fila — mandar "ver agora" uma lista sem novidade é prometer o que não há.
  it('quando nada foi enviado, não oferece "Ver agora"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        batchId: null,
        fileCount: 0,
        duplicateFileNames: ['a.pdf'],
        duplicateCount: 1,
        message: 'ok',
      }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000)]);
    clickEnviar();

    expect(
      await screen.findByText(/Esse arquivo já havia sido enviado e processado anteriormente/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver agora' })).not.toBeInTheDocument();
  });

  // Envio parcial ainda colocou arquivos na fila: o atalho pra lista continua fazendo sentido.
  it('envio parcial mantém o "Ver agora"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        batchId: 'b1',
        fileCount: 1,
        duplicateFileNames: ['b.pdf'],
        duplicateCount: 1,
        message: 'ok',
      }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByRole('button', { name: 'Ver agora' })).toBeInTheDocument();
  });

  it('envio limpo continua verde, sem título de alerta', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        batchId: 'b1',
        fileCount: 2,
        duplicateFileNames: [],
        duplicateCount: 0,
        message: 'ok',
      }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByText(/2 arquivos enviados\./)).toBeInTheDocument();
    expect(screen.getByRole('alert').className).toContain('success');
    expect(screen.queryByText(/não foi enviado/)).not.toBeInTheDocument();
  });

  it('mostra a mensagem do back quando ele rejeita (defesa em profundidade)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Máximo de 20 arquivos por batch.' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('unico.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByText('Máximo de 20 arquivos por batch.')).toBeInTheDocument();
  });

  it('mostra fallback específico quando o back não devolve mensagem (ex: bloqueio opaco do Vercel)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('unico.pdf', 1000)]);
    clickEnviar();

    expect(
      await screen.findByText(/Verifique se são no máximo 20 arquivos e 4 MB no total/),
    ).toBeInTheDocument();
  });

  it('mantém a seleção depois de uma falha, permitindo tentar de novo sem reselecionar', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Erro interno.' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('unico.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByText('Erro interno.')).toBeInTheDocument();
    expect(screen.getByText('unico.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Enviar/ })).toBeEnabled();
  });
});

// No Android, seletores que entregam o arquivo por content:// (gerenciador de arquivos do
// MIUI, entre outros) preenchem file.name com um nome gerado, muitas vezes sem extensão. A
// triagem local exigia extensão, então recusava arquivo válido e a seleção aparecia vazia —
// como se o usuário tivesse cancelado. Com o upload só-PDF (24/08), o caso vale pro PDF sem
// extensão no nome, aceito pelo tipo MIME.
describe('UploadCard — arquivo vindo de seletor que não informa extensão no nome', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    push.mockClear();
    refresh.mockClear();
  });

  function makeFileWithoutExtension(name: string, sizeBytes: number, type: string, lastModified: number): File {
    return new File([new Uint8Array(sizeBytes)], name, { type, lastModified });
  }

  it('aceita PDF sem extensão no nome quando o tipo MIME é application/pdf', async () => {
    render(<UploadCard />);

    await selectFiles([makeFileWithoutExtension('1000012345', 1000, 'application/pdf', 1)]);

    expect(await screen.findByText(/1 de 20 arquivo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Enviar/ })).toBeEnabled();
  });

  it('aceita vários PDFs sem extensão de uma vez, que é o caso que aparecia vazio', async () => {
    render(<UploadCard />);

    await selectFiles([
      makeFileWithoutExtension('1000012345', 1000, 'application/pdf', 1),
      makeFileWithoutExtension('1000012346', 1000, 'application/pdf', 2),
      makeFileWithoutExtension('1000012347', 1000, 'application/pdf', 3),
    ]);

    expect(await screen.findByText(/3 de 20 arquivo/)).toBeInTheDocument();
  });

  it('foto sem extensão também é recusada — o MIME de imagem não salva mais', async () => {
    render(<UploadCard />);

    await selectFiles([makeFileWithoutExtension('1000012345', 1000, 'image/jpeg', 1)]);

    expect(await screen.findByText(/envio por foto chega em breve/)).toBeInTheDocument();
    expect(screen.queryByText(/1 de 20 arquivo/)).not.toBeInTheDocument();
  });

  it('continua recusando quando nem o nome nem o tipo MIME servem', async () => {
    render(<UploadCard />);

    await selectFiles([makeFileWithoutExtension('1000012345', 1000, 'audio/mpeg', 1)]);

    expect(await screen.findByText(/Por enquanto aceitamos só PDF/)).toBeInTheDocument();
    expect(screen.queryByText(/1 de 20 arquivo/)).not.toBeInTheDocument();
  });

  // Sem lastModified na identidade, dois arquivos com o mesmo nome gerado e o mesmo tamanho
  // colidiriam e um sumiria da seleção sem aviso nenhum.
  it('mantém dois arquivos de mesmo nome e mesmo tamanho quando o momento de captura difere', async () => {
    render(<UploadCard />);

    await selectFiles([
      makeFileWithoutExtension('DOC', 1000, 'application/pdf', 1),
      makeFileWithoutExtension('DOC', 1000, 'application/pdf', 2),
    ]);

    expect(await screen.findByText(/2 de 20 arquivo/)).toBeInTheDocument();
  });

  it('mostra um rótulo legível no lugar do nome quando o seletor não informa nome algum', async () => {
    render(<UploadCard />);

    await selectFiles([makeFileWithoutExtension('', 1000, 'application/pdf', 1)]);

    expect(await screen.findByText('arquivo sem nome')).toBeInTheDocument();
  });
});
