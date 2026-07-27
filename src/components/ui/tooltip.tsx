import { cn } from '@/lib/utils';

// Tooltip só em CSS, inspirado no visual discreto do Material UI. Funciona
// inclusive sobre <button disabled>, pois o hover/foco é capturado pelo wrapper.
//
// content aceita ReactNode (não só string) pra tooltips com estrutura — ex.: a lista de
// exames incluídos na tela de Resultados, um por linha. placement="right" existe pro caso
// de célula de tabela: pra cima, o tooltip morre no overflow-hidden do contêiner da grid.
export function Tooltip({
  content,
  children,
  className,
  placement = 'top',
}: {
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?: 'top' | 'right';
}) {
  if (!content) return <>{children}</>;

  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-max max-w-[260px] rounded-[4px] bg-[#5f5f5f]/95 px-2.5 py-1 text-[11px] font-normal leading-snug text-white opacity-0 shadow-sm transition-opacity delay-300 duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          placement === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2 text-center',
          placement === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2 text-left',
        )}
      >
        {content}
      </span>
    </span>
  );
}
