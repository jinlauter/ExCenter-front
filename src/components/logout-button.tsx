'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Mesmo se a chamada falhar, queremos forçar o redirect (sessão local pode estar quebrada).
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      title="Sair"
      className="h-8 w-8 text-muted-foreground"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.75} />
    </Button>
  );
}
