'use client';

import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// SessionExpiredWatcher (client)
// =============================================================================
// Avisa PROATIVAMENTE quando a sessão morre de vez (refresh token expirado ou
// revogado), em vez de deixar o usuário descobrir na próxima ação falhando com
// um erro seco. Checa GET /api/me quando a aba volta a ficar visível (o caso
// real: usuário deixou o site aberto e voltou depois) e a cada 5min com a aba
// visível. A própria checagem renova o access token via BFF quando dá — ou
// seja, aba ativa com sessão renovável nunca vê este aviso; só sessão
// genuinamente morta (401) dispara o overlay.
//
// O botão vai pra /api/session/expire (não /login direto): o cookie inválido
// ainda pode existir, e o middleware devolveria /login → /home em loop. Essa
// rota apaga o cookie antes de redirecionar.
// =============================================================================

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function SessionExpiredWatcher() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (expired) return;
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!cancelled && res.status === 401) setExpired(true);
      } catch {
        // Falha de rede não é sessão expirada — não assusta o usuário à toa.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') check();
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') check();
    }, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [expired]);

  if (!expired) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-label="Sessão expirada"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
          <LogIn className="h-6 w-6 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-medium">Sua sessão expirou</h2>
        <p className="mx-auto mb-5 mt-1 max-w-xs text-sm text-muted-foreground">
          Por segurança, você foi desconectado após um tempo sem usar. Entre novamente pra continuar.
        </p>
        {/* <a> (navegação completa), não <Link>: /api/session/expire é uma route handler
            que apaga o cookie e redireciona — precisa de um request de documento real. */}
        <a href="/api/session/expire" className={cn(buttonVariants(), 'w-full')}>
          Entrar novamente
        </a>
      </div>
    </div>
  );
}
