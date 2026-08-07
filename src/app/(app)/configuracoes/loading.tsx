import { CardSkeleton, PageHeaderSkeleton } from '@/components/page-loading-skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <CardSkeleton className="h-56 w-full" />
      <CardSkeleton className="h-40 w-full" />
    </div>
  );
}
