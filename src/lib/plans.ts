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

/**
 * Se o plano inclui exportar o laudo do ExCenter em PDF.
 *
 * ESPELHO de PlanEntitlements.CanExportExamPdf no back, e existe só pra UX — o front usa isto
 * pra não oferecer um botão que vai ser recusado. A trava é o back, que responde 403 em
 * `GET /api/bloodtests/exams/{id}?forExport=true`. Se os dois divergirem, quem manda é lá.
 */
export function canExportExamPdf(plan: string): boolean {
  return plan === 'Personal' || plan === 'Unlimited';
}

/**
 * Se o plano tem teto de envios — ou seja, se consumir uma vaga significa alguma coisa.
 *
 * ESPELHO da tabela do back (PlanEntitlements): Grátis tem teto vitalício, Pessoal tem teto
 * mensal, Ilimitado não tem. Só serve pra UX — decidir se vale a pena avisar o usuário de algo
 * que, no Ilimitado, não tem consequência nenhuma.
 */
export function hasUploadCap(plan: string): boolean {
  return plan === 'Free' || plan === 'Personal';
}
