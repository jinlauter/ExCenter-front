import { cn } from '@/lib/utils';

// Tooltip só em CSS, inspirado no visual discreto do Material UI. Funciona
// inclusive sobre <button disabled>, pois o hover/foco é capturado pelo wrapper.
export function Tooltip({
  content,
  children,
  className,
}: {
  content?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!content) return <>{children}</>;

  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-[4px] bg-[#5f5f5f]/95 px-2.5 py-1 text-center text-[11px] font-normal leading-snug text-white opacity-0 shadow-sm transition-opacity delay-300 duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
