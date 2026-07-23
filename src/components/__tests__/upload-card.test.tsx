import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadCard } from '@/components/upload-card';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
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
  });

  it('mostra os limites visíveis pro usuário antes de selecionar', () => {
    render(<UploadCard />);

    expect(screen.getByText('Até 20 arquivos por vez, 4 MB no total.')).toBeInTheDocument();
  });

  it('mostra um quadradinho por arquivo selecionado, com nome e tamanho', async () => {
    render(<UploadCard />);

    await selectFiles([makeFile('exame1.pdf', 512 * 1024), makeFile('exame2.pdf', 2 * 1024 * 1024)]);

    expect(screen.getByText('exame1.pdf')).toBeInTheDocument();
    expect(screen.getByText('512 KB')).toBeInTheDocument();
    expect(screen.getByText('exame2.pdf')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
  });

  it('aceita imagens (JPG/PNG) além de PDF', async () => {
    render(<UploadCard />);

    await selectFiles([
      makeFile('exame.pdf', 1000, 'application/pdf'),
      makeFile('foto.jpg', 1000, 'image/jpeg'),
      makeFile('scan.png', 1000, 'image/png'),
    ]);

    expect(screen.getByText('3 de 20 arquivos selecionados')).toBeInTheDocument();
    expect(screen.queryByText(/Só aceitamos/)).not.toBeInTheDocument();
  });

  it('recusa tipos sem relação com documento de exame (.exe, .mp3) e não os adiciona', async () => {
    render(<UploadCard />);

    await selectFiles([
      makeFile('exame.pdf', 1000, 'application/pdf'),
      makeFile('virus.exe', 1000, 'application/octet-stream'),
      makeFile('musica.mp3', 1000, 'audio/mpeg'),
    ]);

    expect(await screen.findByText(/Só aceitamos PDF e imagens/)).toBeInTheDocument();
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

  it('não duplica o mesmo arquivo reselecionado (dedupe por nome+tamanho)', async () => {
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

    expect(screen.getByText('Até 20 arquivos por vez, 4 MB no total.')).toBeInTheDocument();
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

    expect(await screen.findByText(/20 arquivo\(s\) enviado\(s\)/)).toBeInTheDocument();
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

    expect(await screen.findByText(/1 arquivo\(s\) enviado\(s\)/)).toBeInTheDocument();
  });

  // ── Duplicatas (detectadas pelo back via hash de conteúdo) ─────────────────

  it('quando parte dos arquivos já existia, avisa quantos foram enviados e quantos eram duplicata', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 2, duplicateCount: 1, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000), makeFile('c.pdf', 1000)]);
    clickEnviar();

    expect(await screen.findByText(/2 arquivo\(s\) enviado\(s\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/1 arquivo\(s\) já haviam sido enviados antes e não foram reprocessados/),
    ).toBeInTheDocument();
  });

  it('quando todos os arquivos já existiam, avisa que nenhum foi reprocessado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: null, fileCount: 0, duplicateCount: 2, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000), makeFile('b.pdf', 1000)]);
    clickEnviar();

    expect(
      await screen.findByText(/Todos os arquivos selecionados já haviam sido enviados e processados anteriormente/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/arquivo\(s\) enviado\(s\)/)).not.toBeInTheDocument();
  });

  it('quando só 1 arquivo já existia (de 1 só), avisa no singular', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: null, fileCount: 0, duplicateCount: 1, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('a.pdf', 1000)]);
    clickEnviar();

    expect(
      await screen.findByText(/Esse arquivo já havia sido enviado e processado anteriormente/),
    ).toBeInTheDocument();
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
