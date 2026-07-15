import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('UploadCard — limites de envio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('mostra os limites visíveis pro usuário', () => {
    render(<UploadCard />);

    expect(screen.getByText('Até 20 arquivos por vez, 4 MB no total.')).toBeInTheDocument();
  });

  it('bloqueia mais de 20 arquivos sem chamar a API', async () => {
    render(<UploadCard />);

    const files = Array.from({ length: 21 }, (_, i) => makeFile(`exame${i}.pdf`, 1000));
    await selectFiles(files);

    expect(await screen.findByText('Envie no máximo 20 arquivos por vez. Você selecionou 21.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('permite exatamente 20 arquivos pequenos (não bloqueia por contagem)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 20, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    const files = Array.from({ length: 20 }, (_, i) => makeFile(`exame${i}.pdf`, 1000));
    await selectFiles(files);

    expect(await screen.findByText(/20 arquivo\(s\) enviado\(s\)/)).toBeInTheDocument();
  });

  it('bloqueia quando o total passa de 4MB, sem chamar a API', async () => {
    render(<UploadCard />);

    const files = [makeFile('grande.pdf', 5 * 1024 * 1024)];
    await selectFiles(files);

    expect(await screen.findByText(/passa do limite de 4 MB por envio/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('permite quando o total está exatamente dentro do limite', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ batchId: 'b1', fileCount: 1, message: 'ok' }),
    } as Response);
    render(<UploadCard />);

    const files = [makeFile('exato.pdf', 4 * 1024 * 1024)];
    await selectFiles(files);

    expect(await screen.findByText(/1 arquivo\(s\) enviado\(s\)/)).toBeInTheDocument();
  });

  it('mostra a mensagem do back quando ele rejeita (defesa em profundidade)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Máximo de 20 arquivos por batch.' }),
    } as Response);
    render(<UploadCard />);

    await selectFiles([makeFile('unico.pdf', 1000)]);

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

    expect(
      await screen.findByText(/Verifique se são no máximo 20 arquivos e 4 MB no total/),
    ).toBeInTheDocument();
  });
});
