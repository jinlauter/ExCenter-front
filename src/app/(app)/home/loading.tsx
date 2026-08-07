import { CardSkeleton, PageHeaderSkeleton } from '@/components/page-loading-skeleton';

// A Home espera duas chamadas ao back (perfil + resumo dos envios). Sem este arquivo o
// Next segura a navegação inteira até as duas responderem, e a tela anterior fica congelada
// sem sinal nenhum de que algo está acontecendo.
export default function HomeLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <CardSkeleton className="h-24 w-full" />
      <CardSkeleton className="h-44 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CardSkeleton className="h-[74px] w-full" />
        <CardSkeleton className="h-[74px] w-full" />
      </div>
    </div>
  );
}
