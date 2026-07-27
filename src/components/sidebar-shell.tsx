'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { cn } from '@/lib/utils';

// No mobile a sidebar vira uma gaveta (off-canvas) escondida por padrão, aberta pelo
// hambúrguer da barra superior. Em md+ ela volta a ser o <aside> estático de sempre.
export function SidebarShell(props: {
  username: string;
  dateOfBirth?: string | null;
  avatarUpdatedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 md:hidden">
        <span className="text-sm font-semibold text-white">ExCenter</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="text-white/85 hover:text-white"
        >
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fechada, a gaveta é empurrada 2px ALÉM da largura dela, não exatamente 100%: com
          -translate-x-full ela para encostada na borda da viewport (right = 0) e o
          arredondamento de subpixel deixa escapar um fio verde na coluna x=0, sobre o fundo
          claro do conteúdo. Os 2px extras são invisíveis na animação e matam a sobra. */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 -translate-x-[calc(100%+2px)] transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <Sidebar
          {...props}
          headerExtra={
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="mb-1 self-end text-white/70 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          }
        />
      </div>
    </>
  );
}
