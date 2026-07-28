/* eslint-disable @next/next/no-img-element -- imagem vem de rota BFF privada autenticada */

import { Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SidebarNav } from '@/components/sidebar-nav';
import { LogoutButton } from '@/components/logout-button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Sidebar SSR — renderiza marca + iniciais a partir do perfil autenticado.
// SidebarNav é client (precisa de usePathname pra realçar o item ativo).
//
// `collapsed` (só desktop) encolhe pra um trilho de ícones de 72px: em notebook os 250px
// cheios comem tela demais. O conteúdo ao lado cresce sozinho — a sidebar participa do flex
// do layout, então largura liberada aqui vira largura do <main>. Textos somem, ícones ficam,
// e cada item ganha tooltip com o rótulo (ver SidebarNav).
export function Sidebar({
  username,
  dateOfBirth,
  avatarUpdatedAt,
  headerExtra,
  collapsed = false,
}: {
  username: string;
  dateOfBirth?: string | null;
  avatarUpdatedAt?: string | null;
  /** Botão de fechar a gaveta no mobile (injetado pelo SidebarShell). */
  headerExtra?: React.ReactNode;
  /** Trilho de ícones no desktop. O mobile ignora (a gaveta abre sempre cheia). */
  collapsed?: boolean;
}) {
  const initial = (username[0] ?? '?').toUpperCase();
  const birthDateLabel = dateOfBirth
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(dateOfBirth))
    : 'Data de nascimento não informada';

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col bg-primary p-4 transition-[width] duration-200',
        collapsed ? 'w-[72px] px-2' : 'w-[250px]',
      )}
    >
      {headerExtra}
      <div className={cn('mb-2.5 mt-1.5 flex flex-col items-center', !collapsed && 'px-1')}>
        <div
          className={cn(
            'flex items-center justify-center overflow-hidden rounded-full bg-primary-light font-semibold text-primary transition-all',
            collapsed ? 'h-10 w-10 text-base' : 'mb-3 h-[72px] w-[72px] text-[28px]',
          )}
        >
          {avatarUpdatedAt ? (
            <img
              src={`/api/users/avatar?v=${encodeURIComponent(avatarUpdatedAt)}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        {!collapsed && (
          <>
            <p className="mb-0.5 text-[13px] font-semibold text-white">{username}</p>
            <p className="text-[11px] text-white/60">{birthDateLabel}</p>
          </>
        )}
      </div>

      <Separator className="mb-2 bg-white/20" />

      <SidebarNav collapsed={collapsed} />

      <div className="mt-auto">
        <div className={cn('mb-2 flex items-center gap-2', collapsed ? 'justify-center' : 'px-1')}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white">
            <Activity className="h-4 w-4 text-primary" strokeWidth={1.75} />
          </div>
          {!collapsed && <span className="text-sm font-medium text-white">ExCenter</span>}
        </div>

        <Separator className="mb-3 bg-white/20" />
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
          {!collapsed && <span className="text-xs text-white/60">Sair da conta</span>}
          {collapsed ? (
            <Tooltip content="Sair da conta" placement="right">
              <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
            </Tooltip>
          ) : (
            <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
          )}
        </div>
      </div>
    </aside>
  );
}
