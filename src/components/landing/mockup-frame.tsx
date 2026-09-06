import type { ReactNode } from 'react';

// Moldura de navegador dos prints da landing. Existe para que cada mockup cuide só do próprio
// conteúdo — a barra de endereço, a borda e a legenda são iguais em todos e não deviam ser
// recopiadas a cada tela nova que a página resolver mostrar.

export function MockupFrame({
  url,
  caption,
  children,
}: {
  url: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-2 border-b border-border bg-muted/70 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </span>
        <span className="mx-auto rounded-md bg-card px-3 py-1 font-mono text-[10.5px] text-muted-foreground">
          {url}
        </span>
      </div>
      {children}
      <figcaption className="border-t border-border bg-muted/50 px-4 py-2 text-center text-[11px] text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
