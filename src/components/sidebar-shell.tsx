'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// No mobile a sidebar vira uma gaveta (off-canvas) escondida por padrão, aberta pelo
// hambúrguer da barra superior. Em md+ ela volta a ser o <aside> estático de sempre — mas
// minimizável para um trilho de ícones: em tela de notebook, os 250px cheios comem espaço
// demais. O conteúdo cresce sozinho quando ela encolhe (flex do layout).
//
// O estado minimizado persiste num COOKIE (não localStorage) de propósito: o layout é server
// component e lê o cookie pra renderizar já no estado certo — com localStorage, todo reload
// abriria expandido e "pulava" pro minimizado depois da hidratação.
export function SidebarShell(props: {
  username: string;
  dateOfBirth?: string | null;
  avatarUpdatedAt?: string | null;
  initialCollapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(props.initialCollapsed ?? false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      document.cookie = `sidebar-collapsed=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  // Hambúrguer dentro de um círculo (pedido do design) — o MESMO desenho nos dois estados;
  // quem diz a ação é o aria-label/tooltip. Ícone diferente por estado faria o botão "pular"
  // de forma entre cliques.
  const collapseButton = (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expandir menu' : 'Minimizar menu'}
      className={cn(
        'hidden h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:flex',
        collapsed ? 'mx-auto mb-1' : 'mb-1 self-end',
      )}
    >
      <Menu className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );

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
          // A gaveta mobile abre sempre CHEIA: minimizada ela não teria razão de existir — no
          // mobile o menu já fica escondido por padrão.
          collapsed={open ? false : collapsed}
          headerExtra={
            <>
              {collapsed && !open ? (
                <Tooltip content="Expandir menu" placement="right" className="mx-auto">
                  {collapseButton}
                </Tooltip>
              ) : (
                collapseButton
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="mb-1 self-end text-white/70 hover:text-white md:hidden"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </>
          }
        />
      </div>
    </>
  );
}
