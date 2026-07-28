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
    expect(f.message).toContain('Já havia sido enviado antes');
    expect(f.duplicateFileNames).toEqual(['c.pdf']);
  });

  it('2 duplicatas: título e concordância no plural', () => {
    const f = buildUploadFeedback(3, ['c.pdf', 'd.pdf']);

    expect(f.title).toBe('2 arquivos não foram enviados');
    expect(f.message).toContain('3 arquivos de 5 foram enviados');
    expect(f.message).toContain('Já haviam sido enviados antes');
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
    expect(f.message).toMatch(/^Esse arquivo já havia sido enviado/);
    // Sem novidade na lista: prometer "ver agora" seria mentira.
    expect(f.showSentListLink).toBeUndefined();
  });

  it('vários: texto no plural', () => {
    expect(buildUploadFeedback(0, ['a.pdf', 'b.pdf']).message).toMatch(
      /^Todos os arquivos selecionados já haviam sido enviados/,
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
