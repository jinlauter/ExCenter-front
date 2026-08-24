import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Landing } from '../landing';

// O seletor "Para você / Para equipes" na seção de preços (24/08/2026): mesmo padrão visual do
// pill Mensal/Anual. Equipes = personal, médico, casa de repouso — N contas ilimitadas, cada
// pessoa com a própria conta, pagamento centralizado em quem contratou.
describe('Landing — planos para equipes', () => {
  it('inicia nos planos individuais, com o seletor visível', () => {
    render(<Landing />);

    expect(screen.getByRole('button', { name: 'Para você' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Para equipes' })).toBeInTheDocument();
    expect(screen.getAllByText('Pessoal').length).toBeGreaterThan(0);
    expect(screen.queryByText('Clínica')).not.toBeInTheDocument();
  });

  it('Para equipes troca os três cards e explica o modelo', () => {
    render(<Landing />);

    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    expect(screen.getByText('Equipe')).toBeInTheDocument();
    expect(screen.getByText('Clínica')).toBeInTheDocument();
    expect(screen.getByText('Instituição ou personalizado')).toBeInTheDocument();
    expect(screen.getAllByText(/pagamento fica centralizado com você/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Assinar Pessoal' })).not.toBeInTheDocument();
  });

  it('preços de equipe respeitam o toggle Mensal/Anual', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    expect(screen.getByText(/R\$ 99/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 299/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Anual/ }));

    expect(screen.getByText(/R\$ 82/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 249/)).toBeInTheDocument();
  });

  it('assinar um plano de equipe abre o checkout com o plano certo', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    fireEvent.click(screen.getByRole('button', { name: 'Assinar Equipe' }));

    // A descrição EXATA do PLANS (com ", pagamento centralizado.") só existe dentro do modal.
    expect(screen.getByText('3 contas com exames ilimitados, pagamento centralizado.')).toBeInTheDocument();
  });

  it('Instituição ou personalizado não tem checkout: é um link de e-mail com assunto pronto', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    const contact = screen.getByRole('link', { name: 'Falar com a gente' });
    expect(contact).toHaveAttribute('href', expect.stringContaining('mailto:jin_lauter@hotmail.com'));
    expect(contact).toHaveAttribute('href', expect.stringContaining('subject='));
  });

  it('voltar Para você restaura os planos individuais', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Para você' }));

    expect(screen.getByRole('button', { name: 'Assinar Pessoal' })).toBeInTheDocument();
    expect(screen.queryByText('Clínica')).not.toBeInTheDocument();
  });
});
