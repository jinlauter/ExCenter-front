import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersAdminView } from '../users-admin-view';
import type { UserAccountSummary } from '../types';

const accounts: UserAccountSummary[] = [
  {
    id: '1',
    username: 'convidada@teste.dev',
    email: 'convidada@teste.dev',
    registrationPending: true,
    invitedAt: '2026-08-08T12:00:00Z',
    createdAt: '2026-08-08T12:00:00Z',
  },
  {
    id: '2',
    username: 'Jin Hwa Francis Lauter',
    email: 'jin@teste.dev',
    registrationPending: false,
    invitedAt: null,
    createdAt: '2026-06-01T12:00:00Z',
  },
];

describe('UsersAdminView — convites e contas', () => {
  it('lista as contas com a situação de cada uma', () => {
    render(<UsersAdminView accounts={accounts} createInvite={vi.fn()} />);

    expect(screen.getAllByText('convidada@teste.dev').length).toBeGreaterThan(0); // username placeholder = e-mail, aparece 2x
    expect(screen.getByText('convite pendente')).toBeInTheDocument();
    expect(screen.getByText('Jin Hwa Francis Lauter')).toBeInTheDocument();
    expect(screen.getByText('conta ativa')).toBeInTheDocument();
  });

  // A regra de ouro: o código aparece UMA vez, com o aviso de que não volta.
  it('convite criado mostra o código com o aviso de cópia única', async () => {
    const createInvite = vi.fn().mockResolvedValue({ ok: true, email: 'nova@pessoa.dev', inviteCode: 'A7KX2M' });
    render(<UsersAdminView accounts={accounts} createInvite={createInvite} />);

    fireEvent.change(screen.getByPlaceholderText('email@dapessoa.com'), { target: { value: 'nova@pessoa.dev' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar convite/ }));

    await waitFor(() => expect(createInvite).toHaveBeenCalledWith('nova@pessoa.dev'));
    expect(await screen.findByText('A7KX2M')).toBeInTheDocument();
    expect(screen.getByText(/o código não aparece de novo/)).toBeInTheDocument();
  });

  it('falha do convite mostra a mensagem sem exibir código nenhum', async () => {
    const createInvite = vi.fn().mockResolvedValue({ ok: false, message: 'Já existe usuário (ou convite) com este e-mail.' });
    render(<UsersAdminView accounts={accounts} createInvite={createInvite} />);

    fireEvent.change(screen.getByPlaceholderText('email@dapessoa.com'), { target: { value: 'ja@existe.dev' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar convite/ }));

    expect(await screen.findByText(/Já existe usuário/)).toBeInTheDocument();
    expect(screen.queryByText(/não aparece de novo/)).not.toBeInTheDocument();
  });
});
