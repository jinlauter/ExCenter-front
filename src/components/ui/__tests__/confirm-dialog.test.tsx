import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// Fake timers ficam confinados a ESTE arquivo (vitest isola por arquivo): usá-los no meio da
// suíte da tela de exames enviados travava o userEvent dos testes seguintes.
afterEach(() => {
  vi.useRealTimers();
});

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Excluir este exame?"
      description="Não tem como recuperar depois."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog — contador de espera', () => {
  it('sem countdownSeconds, confirmar já nasce habilitado', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Sim' })).toBeEnabled();
  });

  it('com countdownSeconds, confirmar nasce travado e mostra a contagem', () => {
    renderDialog({ countdownSeconds: 3 });

    expect(screen.getByRole('button', { name: 'Sim (3)' })).toBeDisabled();
  });

  it('a contagem regride a cada segundo e libera o botão no zero', async () => {
    vi.useFakeTimers();
    renderDialog({ countdownSeconds: 3 });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Sim (2)' })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Sim (1)' })).toBeDisabled();

    // No zero o contador some do rótulo — não fica "Sim (0)".
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Sim' })).toBeEnabled();
  });

  it('clicar no confirmar durante a contagem não dispara a ação', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog({ countdownSeconds: 3 });

    await user.click(screen.getByRole('button', { name: 'Sim (3)' }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog — saídas seguras', () => {
  it('o foco começa no cancelar, não no confirmar', () => {
    renderDialog({ countdownSeconds: 0 });

    expect(screen.getByRole('button', { name: 'Não' })).toHaveFocus();
  });

  it('Esc cancela', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDialog();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clicar fora cancela, clicar dentro não', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByRole('alertdialog'));
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('alertdialog').parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // Enquanto a requisição está em voo, nada pode fechar ou redisparar o diálogo — nem Esc, nem
  // clique fora, nem um segundo clique no confirmar.
  it('durante o isLoading, os dois botões travam e Esc não fecha', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDialog({ isLoading: true });

    expect(screen.getByRole('button', { name: 'Não' })).toBeDisabled();

    await user.keyboard('{Escape}');

    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
