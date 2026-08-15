/* eslint-disable @next/next/no-img-element -- imagem vem de rota BFF privada autenticada */

import { Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SidebarNav } from '@/components/sidebar-nav';
import { LogoutButton } from '@/components/logout-button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { planLabel, type PlanTier } from '@/lib/plans';

// Cores do badge sobre o fundo colorido da sidebar (texto branco). Grátis/Pessoal são pílulas
// translúcidas discretas; Ilimitado ganha destaque âmbar — é o topo, e merece saltar aos olhos.
const PLAN_BADGE_CLASSES: Record<PlanTier, string> = {
  Free: 'bg-white/15 text-white ring-1 ring-white/25',
  Personal: 'bg-white/25 text-white ring-1 ring-white/40',
  Unlimited: 'bg-amber-400 text-amber-950 ring-1 ring-amber-300',
};

function planBadgeClass(plan: string): string {
  return PLAN_BADGE_CLASSES[plan as PlanTier] ?? PLAN_BADGE_CLASSES.Free;
}

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
  plan,
  headerExtra,
  collapsed = false,
}: {
  username: string;
  dateOfBirth?: string | null;
  avatarUpdatedAt?: string | null;
  /** Código do plano da conta (Free/Personal/Unlimited). Ver lib/plans. */
  plan: string;
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
        {!collapsed ? (
          <>
            <p className="mb-0.5 text-[13px] font-semibold text-white">{username}</p>
            <p className="mb-2 text-[11px] text-white/60">{birthDateLabel}</p>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                planBadgeClass(plan),
              )}
            >
              {planLabel(plan)}
            </span>
          </>
        ) : (
          <Tooltip content={`Plano ${planLabel(plan)}`} placement="right">
            <span
              className={cn(
                'mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                planBadgeClass(plan),
              )}
            >
              {planLabel(plan).slice(0, 3)}
            </span>
          </Tooltip>
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
