import { Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SidebarNav } from '@/components/sidebar-nav';
import { LogoutButton } from '@/components/logout-button';

// Sidebar SSR — renderiza marca + iniciais a partir do username da sessão.
// SidebarNav é client (precisa de usePathname pra realçar o item ativo).
export function Sidebar({ username }: { username: string }) {
  const initial = (username[0] ?? '?').toUpperCase();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <span className="text-sm font-medium">ExCenter</span>
      </div>

      <SidebarNav />

      <div className="mt-auto">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B5D4F4] text-[11px] font-medium text-[#0C447C]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{username}</p>
            <p className="text-[11px] text-muted-foreground">Conta pessoal</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
