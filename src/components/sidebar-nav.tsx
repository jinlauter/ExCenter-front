'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/home', label: 'Início', Icon: Home },
  { href: '/exames-enviados', label: 'Exames enviados', Icon: FileText },
  { href: '/historico', label: 'Histórico de exames', Icon: LineChart },
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
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary-light text-primary'
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span className={active ? 'font-medium' : ''}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
