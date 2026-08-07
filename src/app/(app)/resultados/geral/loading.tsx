import { CardSkeleton, PageHeaderSkeleton } from '@/components/page-loading-skeleton';

// A visão geral monta até três gráficos a partir de todo o histórico — é a página mais
// pesada do app, e por isso a que mais sofre sem um limite de carregamento.
export default function GeneralResultsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <CardSkeleton className="h-64 w-full" />
      <CardSkeleton className="h-64 w-full" />
      <CardSkeleton className="h-64 w-full" />
    </div>
  );
}
