import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogoutButton } from '@/components/logout-button';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

// O bug que motivou estes testes (08/2026): o back demorava, o 204 nunca chegava, o cookie
// sobrevivia e o clique em "Sair" não produzia NADA — nem spinner, nem erro, nem navegação.
describe('LogoutButton', () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
  });

  it('sucesso: chama o logout e navega pro login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(refresh).toHaveBeenCalled();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('enquanto espera: botão desabilitado (feedback de que a tentativa está em curso)', async () => {
    let resolveFetch!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; })));
    const user = userEvent.setup();
    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: 'Sair' });
    await user.click(button);

    expect(button).toBeDisabled();
    resolveFetch(new Response(null, { status: 204 }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  // Redirecionar com o cookie vivo seria um no-op silencioso (middleware devolve pra /home):
  // falha tem que virar AVISO, não navegação fantasma.
  it('falha de rede/timeout: mostra o aviso e NÃO navega', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText(/Não foi possível sair/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled(); // dá pra tentar de novo
  });

  it('resposta não-2xx: também vira aviso, sem navegação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText(/Não foi possível sair/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
