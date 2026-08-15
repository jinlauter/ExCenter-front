// Planos da conta. O CÓDIGO estável (Free/Personal/Unlimited) é o que cruza a API — espelha o
// enum PlanTier do back. O rótulo pt-BR vive só aqui, na fronteira de apresentação, pra que
// renomear o que o usuário lê não implique tocar em dado nem em contrato.
//
// (Os mesmos três planos aparecem na landing como 'Grátis'/'Pessoal'/'Ilimitado', mas lá são
// texto de marketing solto; aqui é o vínculo com a conta.)

export type PlanTier = 'Free' | 'Personal' | 'Unlimited';

export const PLAN_LABELS: Record<PlanTier, string> = {
  Free: 'Grátis',
  Personal: 'Pessoal',
  Unlimited: 'Ilimitado',
};

/** Ordem de exibição (do menor pro maior) para seletores. */
export const PLAN_OPTIONS: PlanTier[] = ['Free', 'Personal', 'Unlimited'];

/** Rótulo pt-BR de um código de plano; devolve o próprio valor se vier algo inesperado. */
export function planLabel(plan: string): string {
  return PLAN_LABELS[plan as PlanTier] ?? plan;
}
