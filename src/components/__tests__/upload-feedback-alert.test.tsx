import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildUploadFeedback, UploadFeedbackAlert } from '@/components/upload-feedback-alert';

// A montagem do alerta dentro do fluxo de envio está coberta em upload-card.test.tsx. Aqui o
// foco é a função pura: são três ramos com concordância de número em cada frase, e é o tipo de
// código que quebra em silêncio (texto errado não derruba nada, só fica feio pro usuário).

describe('buildUploadFeedback — sucesso limpo', () => {
  it('1 arquivo: singular', () => {
    const f = buildUploadFeedback(1, []);

    expect(f.type).toBe('success');
    expect(f.message).toMatch(/^1 arquivo enviado\./);
    expect(f.title).toBeUndefined(); // não há o que destacar
    expect(f.showSentListLink).toBe(true);
  });

  it('vários arquivos: plural', () => {
    expect(buildUploadFeedback(3, []).message).toMatch(/^3 arquivos enviados\./);
  });
});

describe('buildUploadFeedback — envio parcial', () => {
  it('1 duplicata: título no singular e total somando enviados + barrados', () => {
    const f = buildUploadFeedback(2, ['c.pdf']);

    expect(f.type).toBe('warning');
    expect(f.title).toBe('1 arquivo não foi enviado');
    expect(f.message).toContain('2 arquivos de 3 foram enviados');
    expect(f.excluded).toEqual([{ label: 'Já enviado antes:', names: ['c.pdf'] }]);
  });

  it('2 duplicatas: título e concordância no plural', () => {
    const f = buildUploadFeedback(3, ['c.pdf', 'd.pdf']);

    expect(f.title).toBe('2 arquivos não foram enviados');
    expect(f.message).toContain('3 arquivos de 5 foram enviados');
    expect(f.excluded?.[0]?.label).toBe('Já enviados antes:');
  });

  it('1 enviado e 1 barrado: as duas metades no singular', () => {
    const f = buildUploadFeedback(1, ['b.pdf']);

    expect(f.title).toBe('1 arquivo não foi enviado');
    expect(f.message).toContain('1 arquivo de 2 foi enviado e está sendo processado');
  });

  // Algo entrou na fila — o atalho pra lista continua tendo o que mostrar.
  it('mantém o link pra lista de enviados', () => {
    expect(buildUploadFeedback(2, ['c.pdf']).showSentListLink).toBe(true);
  });
});

describe('buildUploadFeedback — nada enviado', () => {
  it('título diz que nenhum entrou e NÃO oferece o link pra lista', () => {
    const f = buildUploadFeedback(0, ['a.pdf']);

    expect(f.type).toBe('warning');
    expect(f.title).toBe('Nenhum arquivo foi enviado');
    expect(f.message).toMatch(/^O arquivo selecionado não entrou na fila/);
    // Sem novidade na lista: prometer "ver agora" seria mentira.
    expect(f.showSentListLink).toBeUndefined();
  });

  it('vários: texto no plural', () => {
    expect(buildUploadFeedback(0, ['a.pdf', 'b.pdf']).message).toMatch(
      /^Nenhum dos arquivos selecionados entrou na fila/,
    );
  });
});

describe('UploadFeedbackAlert — renderização', () => {
  // O alertVariants posiciona `[&>svg]` absoluto e afasta os irmãos com pl-7; isso só funciona
  // se o ícone for filho DIRETO do Alert.
  it('o ícone é filho direto do alerta, para o CSS de posicionamento valer', () => {
    render(<UploadFeedbackAlert feedback={buildUploadFeedback(2, ['c.pdf'])} />);

    expect(screen.getByRole('alert').querySelector(':scope > svg')).not.toBeNull();
  });

  it('sem onOpenSentList não renderiza o botão, mesmo com showSentListLink', () => {
    render(<UploadFeedbackAlert feedback={buildUploadFeedback(2, [])} />);

    expect(screen.queryByRole('button', { name: 'Ver agora' })).not.toBeInTheDocument();
  });

  it('estado de navegação troca o rótulo e desabilita o botão', () => {
    render(
      <UploadFeedbackAlert
        feedback={buildUploadFeedback(2, [])}
        isOpeningSentList
        onOpenSentList={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Abrindo...' })).toBeDisabled();
  });
});

// O teto do plano apara o lote: o back aceita o que cabe e devolve o nome do resto. Os dois
// motivos de exclusão convivem no MESMO envio, e o usuário faz coisas diferentes com cada um —
// duplicata já está no sistema, fora da cota volta a caber depois ou com outro plano.
describe('buildUploadFeedback — teto do plano', () => {
  it('lista os que não couberam com o motivo próprio', () => {
    const f = buildUploadFeedback(2, [], ['c.pdf']);

    expect(f.type).toBe('warning');
    expect(f.title).toBe('1 arquivo não foi enviado');
    expect(f.excluded).toEqual([
      { label: 'Fora do limite de envios do seu plano:', names: ['c.pdf'] },
    ]);
  });

  it('duplicata e cota no mesmo envio viram DOIS grupos, cada um com sua etiqueta', () => {
    const f = buildUploadFeedback(1, ['b.pdf'], ['c.pdf', 'd.pdf']);

    expect(f.title).toBe('3 arquivos não foram enviados');
    expect(f.message).toContain('1 arquivo de 4 foi enviado');
    expect(f.excluded).toEqual([
      { label: 'Já enviado antes:', names: ['b.pdf'] },
      { label: 'Fora do limite de envios do seu plano:', names: ['c.pdf', 'd.pdf'] },
    ]);
  });

  it('cota esgotada sem nada entrar na fila não oferece o link pra lista', () => {
    const f = buildUploadFeedback(0, [], ['a.pdf']);

    expect(f.title).toBe('Nenhum arquivo foi enviado');
    expect(f.showSentListLink).toBeUndefined();
  });

  it('os dois grupos aparecem na tela, com os nomes sob cada etiqueta', () => {
    render(<UploadFeedbackAlert feedback={buildUploadFeedback(1, ['b.pdf'], ['c.pdf'])} />);

    expect(screen.getByText('Já enviado antes:')).toBeInTheDocument();
    expect(screen.getByText('Fora do limite de envios do seu plano:')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(screen.getByText('c.pdf')).toBeInTheDocument();
  });
});
