'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// NavBanner — o card-atalho tracejado que leva pra outra tela
// =============================================================================
// Usado no topo de Exames enviados (→ envio) e de Resultado de exames (→ histórico geral).
// É um botão com useTransition, e não um <Link>, de propósito: os destinos são páginas
// renderizadas no servidor (1-2s buscando dados no back), e um link puro não dá NENHUM
// sinal de que o clique pegou — parecia clique perdido, e o usuário clicava de novo. No
// clique, a seta vira spinner e o card desabilita até a navegação completar.
// =============================================================================

export function NavBanner({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  return (
    <button
      type="button"
      disabled={isNavigating}
      aria-busy={isNavigating}
      onClick={() => startNavigation(() => router.push(href))}
      className={cn(
        'mb-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-primary-lighter bg-primary-light/30 px-4 py-3 text-left transition-colors hover:bg-primary-light/60',
        isNavigating && 'opacity-80',
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{isNavigating ? 'Abrindo...' : title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {isNavigating ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      )}
    </button>
  );
}
