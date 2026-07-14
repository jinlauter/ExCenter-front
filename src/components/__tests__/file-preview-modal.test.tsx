import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePreviewModal } from '@/components/file-preview-modal';

describe('FilePreviewModal', () => {
  it('renderiza um iframe pra PDF', () => {
    const { container } = render(<FilePreviewModal fileId="f1" fileName="laudo.pdf" onClose={vi.fn()} />);

    const iframe = container.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('src', '/api/bloodtests/files/f1/download?inline=true');
    expect(container.querySelector('img')).not.toBeInTheDocument();
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
