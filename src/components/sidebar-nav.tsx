'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Home, FileText, LineChart, Loader2, Settings } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/home', label: 'Início', Icon: Home },
  { href: '/exames-enviados', label: 'Exames enviados', Icon: FileText },
  // O startsWith do estado ativo cobre as sub-rotas: /resultados/geral e
  // /resultados/[testId] mantêm este item aceso.
  { href: '/resultados', label: 'Resultado de exames', Icon: LineChart },
  { href: '/configuracoes', label: 'Configurações', Icon: Settings },
] as const;

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Chegou na rota nova: nenhum link continua pendente. Ajuste DURANTE a renderização, e não num
  // efeito — o React reprocessa antes de pintar, então o spinner some no mesmo quadro em que a
  // página troca, em vez de sobreviver a um quadro extra (react-hooks/set-state-in-effect).
  const [pathnameOfLastRender, setPathnameOfLastRender] = useState(pathname);
  if (pathname !== pathnameOfLastRender) {
    setPathnameOfLastRender(pathname);
    setPendingHref(null);
  }

  function handleNavigation(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (pathname === href || pendingHref) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setPendingHref(href);
    startTransition(() => router.push(href));
  }

  return (
    <nav className="flex-1 space-y-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const loading = pendingHref === href && isPending;

        const link = (
          <Link
            key={collapsed ? undefined : href}
            href={href}
            onClick={(event) => handleNavigation(event, href)}
            aria-disabled={Boolean(pendingHref)}
            aria-label={collapsed ? label : undefined}
            className={cn(
              'relative flex items-center gap-2 text-sm transition-colors',
              collapsed ? 'w-full justify-center rounded-md px-0 py-2.5' : 'px-3 py-2',
              active
                ? collapsed
                  ? // Trilho de ícones: sem lugar pro entalhe (ele assume a aba encostada na
                    // borda direita) — o ativo vira um bloco claro simples.
                    'rounded-md bg-background font-semibold text-primary'
                  : // "Entalhe" nos dois cantos direitos: o item ativo funde visualmente com o
                    // fundo da área de conteúdo (bg-background), como se fosse uma aba conectada.
                    cn(
                      'z-10 -mr-4 rounded-l-md rounded-r-none bg-background font-semibold text-primary',
                      "before:absolute before:-top-4 before:right-0 before:h-4 before:w-4 before:content-['']",
                      'before:[background:radial-gradient(circle_at_0_0,hsl(var(--primary))_15px,hsl(var(--background))_15.5px)]',
                      "after:absolute after:-bottom-4 after:right-0 after:h-4 after:w-4 after:content-['']",
                      'after:[background:radial-gradient(circle_at_0_100%,hsl(var(--primary))_15px,hsl(var(--background))_15.5px)]',
                    )
                : 'rounded-md text-white/85 hover:bg-white/10',
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
            {!collapsed && <span>{label}</span>}
          </Link>
        );

        // Sem o texto, o rótulo vive num tooltip à direita — o aria-label acima mantém o link
        // nomeado pra leitores de tela mesmo sem hover.
        return collapsed ? (
          <Tooltip key={href} content={label} placement="right" className="w-full">
            {link}
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}
