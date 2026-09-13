'use client';

import { createContext, useContext } from 'react';
import { canExportExamPdf, type PlanTier } from '@/lib/plans';

// O plano da conta, disponível pra qualquer tela da área autenticada.
//
// Vem do layout, que JÁ busca /api/users/me pra Sidebar — é por isso que existe um contexto em
// vez de cada página buscar o perfil de novo: no Neon, cada chamada extra custa compute, e a
// pergunta "qual é o plano?" vai aparecer em várias telas (o contador "2 de 3 envios", o aviso
// ao excluir exame, o histórico além de 90 dias).
//
// Isto é UX, nunca trava: quem recusa é o back. O front usa isso pra não oferecer o que vai ser
// recusado — ver o comentário de canExportExamPdf em lib/plans.
type PlanContextValue = { plan: PlanTier | null };

// null = plano desconhecido (componente renderizado fora do provider, como num teste). Os
// consumidores tratam desconhecido como PERMITIDO de propósito: desabilitar por engano uma
// funcionalidade que a pessoa paga é pior que deixar o back recusar com a mensagem certa.
const PlanContext = createContext<PlanContextValue>({ plan: null });

export function PlanProvider({ plan, children }: { plan: string; children: React.ReactNode }) {
  return <PlanContext.Provider value={{ plan: plan as PlanTier }}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const { plan } = useContext(PlanContext);

  return {
    plan,
    canExportExamPdf: plan === null || canExportExamPdf(plan),
  };
}
