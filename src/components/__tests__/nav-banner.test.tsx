import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloudUpload } from 'lucide-react';
import { NavBanner } from '@/components/nav-banner';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => push.mockClear());

function renderBanner() {
  return render(
    <NavBanner
      href="/home"
      icon={CloudUpload}
      title="Tem mais exames pra enviar?"
      description="Envie novos PDFs ou imagens."
    />,
  );
}

describe('NavBanner', () => {
  it('mostra título e descrição, e navega no clique', async () => {
    renderBanner();

    expect(screen.getByText('Tem mais exames pra enviar?')).toBeInTheDocument();
    expect(screen.getByText('Envie novos PDFs ou imagens.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    expect(push).toHaveBeenCalledWith('/home');
  });

  // O motivo de existir: o destino é renderizado no servidor (1-2s) e um <Link> puro não dava
  // sinal nenhum de que o clique pegou — o usuário clicava de novo achando que tinha errado.
  it('é um botão (não link) para poder carregar estado de pendência no clique', () => {
    renderBanner();

    const banner = screen.getByRole('button');
    expect(banner).toHaveAttribute('type', 'button');
    expect(banner).toHaveAttribute('aria-busy', 'false');
    expect(banner).not.toBeDisabled();
  });
});
