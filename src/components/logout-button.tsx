'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isPending) return;
    setIsPending(true);
    setError(null);

    try {
      // Timeout próprio: sem resposta não há Set-Cookie limpando a sessão — e redirecionar
      // pra /login com o cookie vivo só faz o middleware devolver pra /home, ou seja, nada
      // visível. Melhor assumir a falha e avisar do que fingir que deslogou.
      const res = await fetch('/api/logout', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`logout respondeu ${res.status}`);

      router.replace('/login');
      router.refresh();
    } catch {
      setIsPending(false);
      setError('Não foi possível sair. Verifique sua conexão e tente novamente.');
    }
  }

  return (
    <>
      {error && <Toast message={error} variant="warning" onDismiss={() => setError(null)} />}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        disabled={isPending}
        title="Sair"
        className={cn('h-8 w-8 text-muted-foreground', className)}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        )}
      </Button>
    </>
  );
}
