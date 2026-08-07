import { PageHeaderSkeleton, TableRowsSkeleton } from '@/components/page-loading-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function SentExamsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-full max-w-sm" />
      <TableRowsSkeleton rowCount={8} />
    </div>
  );
}
