import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  // Vender assento de equipe antes de existir assento entregaria uma cobrança sem conta nenhuma
  // do outro lado: os dois checkouts ficam fechados até a máquina de contas Manager existir.
  it.each(['Assinar Clínica', 'Assinar Casa de Apoio'])(
    '%s está desabilitado e explica o motivo no hover',
    async (nome) => {
      render(<Landing />);
      fireEvent.click(screen.getByRole('button', { name: 'Para equipes' }));

      const assinar = screen.getByRole('button', { name: nome });
      expect(assinar).toBeDisabled();

      // O wrapper captura o hover mesmo com o botão desabilitado — é o motivo de o Tooltip
      // envolver o botão em vez de viver ao lado dele.
      await userEvent.hover(assinar.parentElement!);
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        /Planos para equipes em implementação/,
      );

      await userEvent.click(assinar);
      expect(screen.queryByText(/Checkout de demonstração/)).not.toBeInTheDocument();
    },
  );

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

// Cada linha abaixo é uma trava que o back vai cobrar (envios, janela de histórico,
// compartilhamento, exportação do laudo, prioridade na fila). A landing é onde a promessa é
// feita: se o número aqui divergir do enforcement, o produto vende o que não entrega.
describe('Landing — limites de plano prometidos nos cards individuais', () => {
  it('Grátis promete os tetos e marca o que não tem', () => {
    render(<Landing />);

    expect(screen.getByText('3 envios de exames')).toBeInTheDocument();
    expect(screen.getByText('Histórico de 90 dias')).toBeInTheDocument();
    expect(screen.getByText('1 compartilhamento por mês (link de até 7 dias)')).toBeInTheDocument();
    // Duas ocorrências, e é o ponto: a mesma frase aparece riscada no Grátis e prometida no
    // Pessoal. Texto diferente nos dois lados deixaria o leitor sem saber que é a mesma coisa.
    expect(screen.getAllByText('Exportar o laudo do ExCenter em PDF')).toHaveLength(2);
    expect(screen.getByText('Processamento prioritário')).toBeInTheDocument();
  });

  it('Pessoal e Ilimitado prometem os próprios tetos de compartilhamento', () => {
    render(<Landing />);

    expect(
      screen.getByText('10 compartilhamentos por mês (link de até 30 dias)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Compartilhamentos ilimitados (link de até 90 dias)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Processamento prioritário dos envios')).toBeInTheDocument();
  });
});
