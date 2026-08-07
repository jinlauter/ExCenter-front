import { CardSkeleton, PageHeaderSkeleton, TableRowsSkeleton } from '@/components/page-loading-skeleton';

export default function ExamDetailLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <CardSkeleton className="h-20 w-full" />
      <TableRowsSkeleton rowCount={10} />
    </div>
  );
}
