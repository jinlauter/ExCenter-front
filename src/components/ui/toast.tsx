'use client';

import { useEffect } from 'react';
import { CheckCircle2, X, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Toast — aviso passageiro no canto superior direito
// =============================================================================
// Renderize condicionalmente; a mensagem é a identidade do toast:
//
//   {mensagem && <Toast message={mensagem} onDismiss={() => setMensagem(null)} />}
//
// Para confirmar o que ACONTECEU (arquivo excluído, dados salvos). Não serve pra
// erro que exige decisão do usuário — esse precisa ficar na tela até ser lido,
// e é o papel do Alert.
// =============================================================================

interface ToastProps {
  message: string;
  variant?: 'success' | 'warning';
  /** Milissegundos até sumir sozinho. */
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, variant = 'success', duration = 4000, onDismiss }: ToastProps) {
  // `message` entra nas dependências de propósito: uma segunda exclusão logo depois da
  // primeira reinicia a contagem em vez de herdar o tempo que já tinha corrido.
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  const Icon = variant === 'success' ? CheckCircle2 : TriangleAlert;

  return (
    // z acima do ConfirmDialog (z-50) pra confirmação de exclusão continuar visível caso o
    // usuário reabra um diálogo logo em seguida.
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed right-4 top-4 z-[60] flex max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-lg border bg-card px-4 py-3 shadow-lg sm:max-w-sm',
        'motion-safe:animate-[toast-in_150ms_ease-out]',
        variant === 'success' ? 'border-success/30' : 'border-amber-300',
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', variant === 'success' ? 'text-success' : 'text-amber-600')}
      />
      <p className="min-w-0 flex-1 break-words text-sm">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
