import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePreviewModal } from '@/components/file-preview-modal';

vi.mock('@/components/mobile-pdf-viewer', () => ({
  MobilePdfViewer: ({ src }: { src: string }) => <div data-testid="mobile-pdf-viewer" data-src={src} />,
}));

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
}

const DESKTOP_UA = window.navigator.userAgent;

describe('FilePreviewModal', () => {
  afterEach(() => {
    setUserAgent(DESKTOP_UA);
  });

  it('renderiza um iframe pra PDF (desktop)', () => {
    const { container } = render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={vi.fn()} />);

    const iframe = container.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('src', '/api/bloodtests/files/f1/download?inline=true');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('renderiza o visualizador PDF.js em vez do iframe no celular', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36');

    const { container } = render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={vi.fn()} />);

    const viewer = await screen.findByTestId('mobile-pdf-viewer');
    expect(viewer).toHaveAttribute('data-src', '/api/bloodtests/files/f1/download?inline=true');
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
  ])('detecta iOS (%s) como mobile também', async (ua) => {
    setUserAgent(ua);

    render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={vi.fn()} />);

    expect(await screen.findByTestId('mobile-pdf-viewer')).toBeInTheDocument();
  });

  it('imagem continua como <img> mesmo no celular (não usa o visualizador de PDF)', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36');

    render(<FilePreviewModal fileId="f1" fileName="exame.png" onClose={vi.fn()} />);

    expect(screen.getByAltText('exame.png').tagName).toBe('IMG');
    expect(screen.queryByTestId('mobile-pdf-viewer')).not.toBeInTheDocument();
  });

  it.each(['exame.jpg', 'exame.jpeg', 'exame.png', 'EXAME.PNG'])(
    'renderiza uma imagem pra %s',
    (fileName) => {
      render(<FilePreviewModal fileId="f1" fileName={fileName} onClose={vi.fn()} />);

      const img = screen.getByAltText(fileName);
      expect(img.tagName).toBe('IMG');
      expect(img).toHaveAttribute('src', '/api/bloodtests/files/f1/download?inline=true');
    },
  );

  it('chama onClose ao clicar no X', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onClose ao clicar fora do painel (backdrop)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={onClose} />);

    await user.click(screen.getByRole('dialog'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('NÃO chama onClose ao clicar dentro do painel', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={onClose} />);

    await user.click(screen.getByText('laudo.pdf'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });
});
