import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Landing } from '../landing';

// O seletor "Para você / Para equipes" na seção de preços (24/08/2026): mesmo padrão visual do
// pill Mensal/Anual. Equipes = clínica, casa de apoio, instituição — N contas ilimitadas mais
// metade disso em contas Pessoal, cada pessoa com a própria conta, pagamento centralizado em
// quem contratou.
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

    expect(screen.getByText('Clínica')).toBeInTheDocument();
    expect(screen.getByText('Casa de Apoio')).toBeInTheDocument();
    expect(screen.getByText('Instituição ou personalizado')).toBeInTheDocument();
    expect(screen.getAllByText(/pagamento fica centralizado com você/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Assinar Pessoal' })).not.toBeInTheDocument();
  });

  // Cada pacote traz METADE do total em contas Pessoal — é o que diferencia o degrau de um
  // simples "mais contas ilimitadas", então não pode sumir sem alguém perceber.
  it('cada pacote de equipe soma contas ilimitadas e metade disso em contas Pessoal', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    expect(screen.getByText('5 contas com envios de exames ilimitados')).toBeInTheDocument();
    expect(screen.getByText('+ 3 contas Pessoal (até 20 envios por mês cada)')).toBeInTheDocument();
    expect(screen.getByText('10 contas com envios de exames ilimitados')).toBeInTheDocument();
    expect(screen.getByText('+ 5 contas Pessoal (até 20 envios por mês cada)')).toBeInTheDocument();
  });

  it('preços de equipe respeitam o toggle Mensal/Anual', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    expect(screen.getByText(/R\$ 149/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 279/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Anual/ }));

    expect(screen.getByText(/R\$ 124/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 232/)).toBeInTheDocument();
  });

  it('assinar um plano de equipe abre o checkout com o plano certo', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

    fireEvent.click(screen.getByRole('button', { name: 'Assinar Casa de Apoio' }));

    // A descrição EXATA do PLANS (com ", pagamento centralizado.") só existe dentro do modal.
    expect(screen.getByText('10 contas ilimitadas + 5 contas Pessoal, pagamento centralizado.')).toBeInTheDocument();
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
