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
export function blocosPorPainel(groups: ExamDetailGroup[]) {
  const blocos: { panelName: string | null; groups: ExamDetailGroup[] }[] = [];
  const porPainel = new Map<string, { panelName: string | null; groups: ExamDetailGroup[] }>();

  for (const group of groups) {
    const painel = group.panelName?.trim() ? group.panelName : null;

    // Sem painel externo, cada grupo é o seu próprio bloco — não há o que juntar.
    if (!painel) {
      blocos.push({ panelName: null, groups: [group] });
      continue;
    }

    const existente = porPainel.get(painel);
    if (existente) {
      existente.groups.push(group);
      continue;
    }

    const novo = { panelName: painel, groups: [group] };
    porPainel.set(painel, novo);
    blocos.push(novo);
  }

  return blocos;
}
