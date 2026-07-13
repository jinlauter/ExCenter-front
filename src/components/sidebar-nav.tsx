'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, LineChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/home', label: 'Início', Icon: Home },
  { href: '/exames-enviados', label: 'Exames enviados', Icon: FileText },
  { href: '/historico', label: 'Histórico de exames', Icon: LineChart },
  { href: '/configuracoes', label: 'Configurações', Icon: Settings },
] as const;

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              active
                ? // "Entalhe" nos dois cantos direitos: o item ativo funde visualmente com o
                  // fundo da área de conteúdo (bg-background), como se fosse uma aba conectada.
                  cn(
                    'z-10 -mr-4 rounded-l-md rounded-r-none bg-background font-semibold text-primary',
                    "before:absolute before:-top-4 before:right-0 before:h-4 before:w-4 before:content-['']",
                    'before:[background:radial-gradient(circle_at_0_0,hsl(var(--primary))_16px,hsl(var(--background))_16px)]',
                    "after:absolute after:-bottom-4 after:right-0 after:h-4 after:w-4 after:content-['']",
                    'after:[background:radial-gradient(circle_at_0_100%,hsl(var(--primary))_16px,hsl(var(--background))_16px)]',
                  )
                : 'rounded-md text-white/85 hover:bg-white/10',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
