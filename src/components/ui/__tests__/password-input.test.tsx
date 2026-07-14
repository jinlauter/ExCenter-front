import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from '@/components/ui/password-input';

describe('PasswordInput', () => {
  it('começa oculto (type=password) com o ícone de olho fechado', () => {
    render(<PasswordInput aria-label="Senha" />);

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();
  });

  it('ao clicar no olho, revela a senha (type=text) e o ícone vira olho aberto', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
  });

  it('clicar de novo esconde a senha novamente', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });
});
