import { cn } from '@/lib/utils';

// Tooltip só em CSS (group-hover), sem Radix e sem estado — mesmo padrão de
// dependência leve do Checkbox/Select. Funciona em cima de qualquer filho,
// inclusive um <button disabled> (o hover é capturado pelo wrapper, não pelo
// filho — é o que resolve o tooltip não aparecer em botão desabilitado).
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
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[180px] -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-center text-xs leading-snug text-background opacity-0 shadow-md transition-opacity delay-300 duration-150 group-hover:opacity-100"
      >
        {content}
        <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
      </span>
    </span>
  );
}
