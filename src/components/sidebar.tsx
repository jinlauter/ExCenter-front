/* eslint-disable @next/next/no-img-element -- imagem vem de rota BFF privada autenticada */

import { Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SidebarNav } from '@/components/sidebar-nav';
import { LogoutButton } from '@/components/logout-button';

// Sidebar SSR — renderiza marca + iniciais a partir do perfil autenticado.
// SidebarNav é client (precisa de usePathname pra realçar o item ativo).
export function Sidebar({
  username,
  dateOfBirth,
  avatarUpdatedAt,
  headerExtra,
}: {
  username: string;
  dateOfBirth?: string | null;
  avatarUpdatedAt?: string | null;
  /** Botão de fechar a gaveta no mobile (injetado pelo SidebarShell). */
  headerExtra?: React.ReactNode;
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
    <aside className="flex h-full w-[250px] shrink-0 flex-col bg-primary p-4">
      {headerExtra}
      <div className="mb-2.5 mt-1.5 flex flex-col items-center px-1">
        <div className="mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-primary-light text-[28px] font-semibold text-primary">
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
        <p className="mb-0.5 text-[13px] font-semibold text-white">{username}</p>
        <p className="text-[11px] text-white/60">{birthDateLabel}</p>
      </div>

      <Separator className="mb-2 bg-white/20" />

      <SidebarNav />

      <div className="mt-auto">
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <Activity className="h-4 w-4 text-primary" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-medium text-white">ExCenter</span>
        </div>

        <Separator className="mb-3 bg-white/20" />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-white/60">Sair da conta</span>
          <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </div>
    </aside>
  );
}
