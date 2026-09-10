import type { ExamDetailGroup } from '@/types/api';

/** "Material: Soro · Método: Quimioluminescência", ou "" quando o laudo não imprime nenhum. */
export function procedencia(group: ExamDetailGroup | undefined) {
  if (!group) return '';
  return [
    group.material ? `Material: ${group.material}` : null,
    group.method ? `Método: ${group.method}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
}

/**
 * Junta os grupos em blocos por painel externo.
 *
 * Laudo brasileiro aninha dois níveis — "Hemograma com Contagem de Plaquetas" acima de "Série
 * Vermelha" e "Série Branca". Sem isso as seções viram cards soltos e o exame que o médico
 * PEDIU não aparece em lugar nenhum, que é como estava até 09/09/2026.
 *
 * Agrupa por CHAVE, mantendo a ordem da primeira aparição de cada painel. A primeira versão
 * agrupava por ADJACÊNCIA, com o argumento de que os grupos chegam na ordem do laudo e juntar por
 * nome reordenaria o documento — e a premissa era falsa: o back monta os painéis iterando
 * `test.Results` sem `ORDER BY` nenhum, então a ordem que chega não é a do laudo. Resultado
 * visível em exame real (09/09/2026): o hemograma vinha partido em DOIS cards com o mesmo título,
 * com outros exames no meio.
 */
export interface BlocoDePainel {
  /** Título do card: o painel externo, ou o nome do grupo quando ele é o próprio topo. */
  titulo: string;
  /** null quando nenhum grupo do bloco declarou painel externo — aí são cards soltos. */
  panelName: string | null;
  groups: ExamDetailGroup[];
}

export function blocosPorPainel(groups: ExamDetailGroup[]): BlocoDePainel[] {
  const blocos: BlocoDePainel[] = [];
  const porChave = new Map<string, BlocoDePainel>();

  for (const group of groups) {
    const painel = group.panelName?.trim() ? group.panelName : null;

    // A chave é o painel externo OU o próprio nome do grupo. Isso junta duas formas que o mesmo
    // laudo produz para o mesmo exame: as seções internas ("Série Vermelha", com painel externo
    // preenchido) e a medição que pendura DIRETO no cabeçalho externo (que chega como um grupo
    // chamado "Hemograma com Contagem de Plaquetas", sem painel). Sem isso o hemograma voltaria a
    // aparecer em dois cards com o mesmo título — o mesmo defeito, de outra forma.
    const chave = painel ?? group.name;

    const existente = porChave.get(chave);
    if (existente) {
      existente.groups.push(group);
      // Um irmão com painel declarado confirma que o bloco é um painel de verdade.
      if (painel) existente.panelName = painel;
      continue;
    }

    const novo: BlocoDePainel = { titulo: chave, panelName: painel, groups: [group] };
    porChave.set(chave, novo);
    blocos.push(novo);
  }

  return blocos;
}

