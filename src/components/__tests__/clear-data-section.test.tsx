import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClearDataSection } from '@/components/clear-data-section';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

describe('ClearDataSection — limpar meus dados', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('abrir o diálogo de confirmação NÃO dispara a exclusão', async () => {
    render(<ClearDataSection />);

    await userEvent.click(screen.getByRole('button', { name: /Limpar meus dados/ }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/irreversível/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancelar fecha o diálogo sem apagar nada', async () => {
    render(<ClearDataSection />);

    await userEvent.click(screen.getByRole('button', { name: /Limpar meus dados/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('confirmar chama DELETE /api/users/data e mostra sucesso no 204', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 204 } as Response);
    render(<ClearDataSection />);

    await userEvent.click(screen.getByRole('button', { name: /Limpar meus dados/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, apagar tudo' }));

    expect(fetch).toHaveBeenCalledWith('/api/users/data', { method: 'DELETE' });
    expect(
      await screen.findByText('Todos os seus dados de exames foram apagados.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('erro do back aparece pro usuário, permitindo tentar de novo', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 502,
      json: async () => ({ message: 'Não foi possível limpar seus dados. Tente novamente.' }),
    } as Response);
    render(<ClearDataSection />);

    await userEvent.click(screen.getByRole('button', { name: /Limpar meus dados/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, apagar tudo' }));

    expect(
      await screen.findByText('Não foi possível limpar seus dados. Tente novamente.'),
    ).toBeInTheDocument();
  });
});
