import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UsersAdminView } from '../users-admin-view';
import type { UserAccountSummary } from '../types';

const accounts: UserAccountSummary[] = [
  {
    id: '1',
    username: 'convidada@teste.dev',
    email: 'convidada@teste.dev',
    plan: 'Free',
    registrationPending: true,
    invitedAt: '2026-08-08T12:00:00Z',
    createdAt: '2026-08-08T12:00:00Z',
  },
  {
    id: '2',
    username: 'Jin Hwa Francis Lauter',
    email: 'jin@teste.dev',
    plan: 'Unlimited',
    registrationPending: false,
    invitedAt: null,
    createdAt: '2026-06-01T12:00:00Z',
  },
];

function renderView(overrides: Partial<Parameters<typeof UsersAdminView>[0]> = {}) {
  return render(
    <UsersAdminView
      accounts={accounts}
      createInvite={vi.fn()}
      deleteAccount={vi.fn()}
      updatePlan={vi.fn()}
      {...overrides}
    />,
  );
}

describe('UsersAdminView — convites e contas', () => {
  it('lista as contas com a situação de cada uma', () => {
    renderView();

    expect(screen.getAllByText('convidada@teste.dev').length).toBeGreaterThan(0); // username placeholder = e-mail, aparece 2x
    expect(screen.getByText('convite pendente')).toBeInTheDocument();
    expect(screen.getByText('Jin Hwa Francis Lauter')).toBeInTheDocument();
    expect(screen.getByText('conta ativa')).toBeInTheDocument();
  });

  // A regra de ouro: o código aparece UMA vez, com o aviso de que não volta.
  it('convite criado mostra o código com o aviso de cópia única', async () => {
    const createInvite = vi.fn().mockResolvedValue({ ok: true, email: 'nova@pessoa.dev', inviteCode: 'A7KX2M' });
    renderView({ createInvite });

    fireEvent.change(screen.getByPlaceholderText('email@dapessoa.com'), { target: { value: 'nova@pessoa.dev' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar convite/ }));

    await waitFor(() => expect(createInvite).toHaveBeenCalledWith('nova@pessoa.dev', 'Free'));
    expect(await screen.findByText('A7KX2M')).toBeInTheDocument();
    expect(screen.getByText(/o código não aparece de novo/)).toBeInTheDocument();
  });

  it('convite envia o plano escolhido no seletor', async () => {
    const createInvite = vi.fn().mockResolvedValue({ ok: true, email: 'nova@pessoa.dev', inviteCode: 'A7KX2M' });
    renderView({ createInvite });

    fireEvent.change(screen.getByPlaceholderText('email@dapessoa.com'), { target: { value: 'nova@pessoa.dev' } });
    fireEvent.change(screen.getByLabelText('Plano do convite'), { target: { value: 'Personal' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar convite/ }));

    await waitFor(() => expect(createInvite).toHaveBeenCalledWith('nova@pessoa.dev', 'Personal'));
  });

  it('falha do convite mostra a mensagem sem exibir código nenhum', async () => {
    const createInvite = vi.fn().mockResolvedValue({ ok: false, message: 'Já existe usuário (ou convite) com este e-mail.' });
    renderView({ createInvite });

    fireEvent.change(screen.getByPlaceholderText('email@dapessoa.com'), { target: { value: 'ja@existe.dev' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar convite/ }));

    expect(await screen.findByText(/Já existe usuário/)).toBeInTheDocument();
    expect(screen.queryByText(/não aparece de novo/)).not.toBeInTheDocument();
  });
});

describe('UsersAdminView — edição de plano', () => {
  it('mostra o plano atual de cada conta no seletor da linha', () => {
    renderView();

    expect(screen.getByLabelText('Plano de convidada@teste.dev')).toHaveValue('Free');
    expect(screen.getByLabelText('Plano de jin@teste.dev')).toHaveValue('Unlimited');
  });

  it('trocar o plano de uma linha chama a action com id e plano novos', async () => {
    const updatePlan = vi.fn().mockResolvedValue({ ok: true });
    renderView({ updatePlan });

    fireEvent.change(screen.getByLabelText('Plano de jin@teste.dev'), { target: { value: 'Personal' } });

    await waitFor(() => expect(updatePlan).toHaveBeenCalledWith('2', 'Personal'));
  });

  it('falha ao trocar o plano mostra a mensagem do back', async () => {
    const updatePlan = vi.fn().mockResolvedValue({ ok: false, message: 'Plano inválido.' });
    renderView({ updatePlan });

    fireEvent.change(screen.getByLabelText('Plano de jin@teste.dev'), { target: { value: 'Personal' } });

    expect(await screen.findByText('Plano inválido.')).toBeInTheDocument();
  });
});

describe('UsersAdminView — exclusão de conta', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Contador de 3s de propósito: a exclusão apaga exames e arquivos que ninguém recria.
  it('abrir a confirmação não exclui nada e o "Sim" nasce travado pelo contador', () => {
    const deleteAccount = vi.fn();
    renderView({ deleteAccount });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta jin@teste.dev' }));

    expect(screen.getByText('Excluir esta conta?')).toBeInTheDocument();
    expect(screen.getByText(/TUDO que é dela/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sim, excluir tudo \(\d\)$/ })).toBeDisabled();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('"Não" fecha a confirmação sem excluir', () => {
    const deleteAccount = vi.fn();
    renderView({ deleteAccount });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta jin@teste.dev' }));
    fireEvent.click(screen.getByRole('button', { name: 'Não' }));

    expect(screen.queryByText('Excluir esta conta?')).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('após o contador, confirmar chama a exclusão com o id certo e fecha o diálogo', async () => {
    vi.useFakeTimers();
    const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
    renderView({ deleteAccount });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta jin@teste.dev' }));
    // Um act por segundo: cada tick do contador reagenda o próximo setTimeout só depois do
    // re-render — avançar 3000ms de uma vez dispararia apenas o primeiro.
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    vi.useRealTimers(); // o resto do fluxo (transition + promise) roda com timers reais

    const confirm = screen.getByRole('button', { name: 'Sim, excluir tudo' });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(screen.queryByText('Excluir esta conta?')).not.toBeInTheDocument());
  });

  it('falha da exclusão mostra a mensagem do back', async () => {
    vi.useFakeTimers();
    const deleteAccount = vi
      .fn()
      .mockResolvedValue({ ok: false, message: 'Não dá para excluir a própria conta do operador.' });
    renderView({ deleteAccount });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta jin@teste.dev' }));
    // Um act por segundo: cada tick do contador reagenda o próximo setTimeout só depois do
    // re-render — avançar 3000ms de uma vez dispararia apenas o primeiro.
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    vi.useRealTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir tudo' }));

    expect(await screen.findByText(/própria conta do operador/)).toBeInTheDocument();
  });
});
