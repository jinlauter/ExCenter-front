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
 * Os grupos chegam na ORDEM DO LAUDO, então o agrupamento é por ADJACÊNCIA e não por chave:
 * juntar por nome reordenaria o documento.
 */
export function blocosPorPainel(groups: ExamDetailGroup[]) {
  const blocos: { panelName: string | null; groups: ExamDetailGroup[] }[] = [];

  for (const group of groups) {
    const painel = group.panelName?.trim() ? group.panelName : null;
    const ultimo = blocos.at(-1);

    if (painel && ultimo && ultimo.panelName === painel) ultimo.groups.push(group);
    else blocos.push({ panelName: painel, groups: [group] });
  }

  return blocos;
}
