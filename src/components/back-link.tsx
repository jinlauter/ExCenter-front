'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Link de "voltar" com estado de pendência. É um botão, e não um <Link>, pelo mesmo motivo do
// NavBanner: o destino é renderizado no servidor (busca dados no back) e um link puro não dá
// sinal nenhum de que o clique pegou — parece clique perdido. Aqui a seta vira spinner e o
// texto some até a navegação completar.
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  return (
    <button
      type="button"
      disabled={isNavigating}
      aria-busy={isNavigating}
      onClick={() => startNavigation(() => router.push(href))}
      className={cn(
        'mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary',
        isNavigating && 'text-primary',
      )}
    >
      {isNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
      {isNavigating ? 'Voltando...' : label}
    </button>
  );
}
