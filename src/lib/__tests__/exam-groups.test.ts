import { describe, expect, it } from 'vitest';
import { blocosPorPainel, procedencia } from '@/lib/exam-groups';
import type { ExamDetailGroup } from '@/types/api';

function grupo(name: string, panelName?: string | null): ExamDetailGroup {
  return { name, panelName, isSingle: false, results: [] };
}

describe('blocosPorPainel', () => {
  // O caso real: "Hemograma com Contagem de Plaquetas" acima de "Série Vermelha" e "Série
  // Branca". As duas seções têm que cair no MESMO bloco, senão o exame que o médico pediu
  // aparece fatiado em cards soltos.
  it('junta seções consecutivas do mesmo painel num bloco só', () => {
    const blocos = blocosPorPainel([
      grupo('Série Vermelha', 'Hemograma com Contagem de Plaquetas'),
      grupo('Série Branca', 'Hemograma com Contagem de Plaquetas'),
    ]);

    expect(blocos).toHaveLength(1);
    expect(blocos[0]?.panelName).toBe('Hemograma com Contagem de Plaquetas');
    expect(blocos[0]?.groups.map((g) => g.name)).toEqual(['Série Vermelha', 'Série Branca']);
  });

  it('mantém grupo sem painel como bloco próprio', () => {
    const blocos = blocosPorPainel([grupo('Perfil Lipídico'), grupo('Ferritina', null)]);

    expect(blocos).toHaveLength(2);
    expect(blocos.every((b) => b.panelName === null)).toBe(true);
  });

  // Por ADJACÊNCIA, não por chave: os grupos chegam na ordem do laudo, e reagrupar por nome
  // reordenaria o documento — o leitor perderia a correspondência com o papel.
  it('não funde painéis iguais que não são vizinhos', () => {
    const blocos = blocosPorPainel([
      grupo('Série Vermelha', 'Hemograma'),
      grupo('Perfil Lipídico'),
      grupo('Série Branca', 'Hemograma'),
    ]);

    expect(blocos.map((b) => b.panelName)).toEqual(['Hemograma', null, 'Hemograma']);
  });

  it('trata painel em branco como ausente', () => {
    const blocos = blocosPorPainel([grupo('Série Vermelha', '   ')]);

    expect(blocos[0]?.panelName).toBeNull();
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(blocosPorPainel([])).toEqual([]);
  });
});

describe('procedencia', () => {
  it('junta material e método quando os dois existem', () => {
    expect(procedencia({ ...grupo('x'), material: 'Soro', method: 'ELISA' })).toBe(
      'Material: Soro  ·  Método: ELISA',
    );
  });

  it('devolve string vazia quando o laudo não imprime nenhum dos dois', () => {
    expect(procedencia(grupo('x'))).toBe('');
    expect(procedencia(undefined)).toBe('');
  });
});
