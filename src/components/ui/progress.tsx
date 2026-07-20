import { cn } from '@/lib/utils';

interface ProgressProps {
  // Pode passar de 100 pra representar limite estourado — o preenchimento visual fica
  // travado em 100%, mas o valor real ainda é reportado via aria-valuenow.
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-all', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
