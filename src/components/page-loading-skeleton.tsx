import { Skeleton } from '@/components/ui/skeleton';

// Peças compartilhadas pelos loading.tsx de cada rota. Elas existem para que o esqueleto
// ocupe aproximadamente a mesma altura do conteúdo real: um esqueleto muito menor que a
// página faz o conteúdo "pular" quando chega, o que incomoda mais do que a espera.

export function PageHeaderSkeleton({ withSubtitle = true }: { withSubtitle?: boolean }) {
  return (
    <header className="space-y-2">
      <Skeleton className="h-6 w-52" />
      {withSubtitle && <Skeleton className="h-4 w-72" />}
    </header>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? 'h-28 w-full'} />;
}

export function TableRowsSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-11 w-full" />
      ))}
    </div>
  );
}
