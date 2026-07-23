'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// =============================================================================
// ClearDataSection (client) — "danger zone" das Configurações
// =============================================================================
// Botão destrutivo que apaga IRREVERSIVELMENTE todos os arquivos e exames do
// usuário (DELETE /api/users/data). Sempre passa por um diálogo de confirmação
// explícito — a chamada só sai depois do "Sim, apagar tudo". Conta, senha e
// foto de perfil não são afetados (e o texto deixa isso claro pro usuário).
// =============================================================================

type Phase = 'idle' | 'confirming' | 'done' | 'error';

export function ClearDataSection() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmErase() {
    if (isPending) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/users/data', { method: 'DELETE' });

        if (res.status === 204) {
          setPhase('done');
          router.refresh(); // contagens/telas que dependem dos exames voltam zeradas
          return;
        }

        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setErrorMessage(body?.message ?? 'Não foi possível limpar seus dados. Tente novamente.');
        setPhase('error');
      } catch {
        setErrorMessage('Falha de rede. Verifique sua conexão e tente novamente.');
        setPhase('error');
      }
    });
  }

  return (
    <section className="rounded-lg border border-destructive/30 bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-destructive">
        <Trash2 className="h-4 w-4" />
        Limpar meus dados
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Apaga de forma <span className="font-medium text-foreground">definitiva</span> todos os
        arquivos que você enviou e todos os exames e resultados processados — como se nada tivesse
        sido enviado. Sua conta, senha e foto de perfil não são afetadas.
      </p>

      {phase === 'done' && (
        <Alert variant="success" className="mt-3">
          <AlertDescription>Todos os seus dados de exames foram apagados.</AlertDescription>
        </Alert>
      )}
      {phase === 'error' && errorMessage && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button variant="destructive" className="mt-4" onClick={() => setPhase('confirming')}>
        <Trash2 className="h-4 w-4" />
        Limpar meus dados
      </Button>

      {phase === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-label="Confirmar limpeza de dados"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <TriangleAlert className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-base font-medium">Apagar todos os seus dados de exames?</h3>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">
              Essa ação é <span className="font-medium text-foreground">irreversível</span>: todos
              os arquivos enviados, exames e resultados processados serão apagados de forma
              permanente. Não tem como recuperar depois.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPhase('idle')} disabled={isPending}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmErase} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Apagando…
                  </>
                ) : (
                  'Sim, apagar tudo'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
