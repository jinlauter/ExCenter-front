'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =============================================================================
// ConfirmDialog — confirmação de ação irreversível
// =============================================================================
// Renderize condicionalmente (como o FilePreviewModal), não com uma prop `open`:
//
//   {fileToDelete && <ConfirmDialog ... onCancel={() => setFileToDelete(null)} />}
//
// Assim o contador reinicia sozinho a cada abertura — montar de novo é o reset.
//
// Cancelar fica à ESQUERDA e confirmar à direita, os dois centralizados no rodapé:
// a ação destrutiva nunca cai debaixo do polegar/cursor que vinha do "cancelar".
// =============================================================================

interface ConfirmDialogProps {
  title: string;
  description: React.ReactNode;
  /** Bloco em destaque acima da descrição — ex.: o nome do arquivo que será apagado. */
  highlight?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Segundos de espera antes de habilitar o botão de confirmar. 0 (default) = sem contador.
   * Usar só quando a ação apaga algo que o usuário não consegue recriar — a pausa forçada é
   * atrito de propósito, e cobrar isso de toda confirmação treina o usuário a ignorá-la.
   */
  countdownSeconds?: number;
  variant?: 'destructive' | 'default';
  /** Enquanto true, os dois botões ficam travados e o confirmar mostra spinner. */
  isLoading?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  highlight,
  confirmLabel = 'Sim',
  cancelLabel = 'Não',
  countdownSeconds = 0,
  variant = 'destructive',
  isLoading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Foco inicial no "Não": quem chegou aqui por engano (ou dispara Enter no automático) sai
  // sem apagar nada. Também é o que ancora o Tab dentro do diálogo.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isLoading]);

  const isCountingDown = secondsLeft > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={() => !isLoading && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="flex items-center gap-2 text-base font-medium">
          {icon ?? (
            <TriangleAlert
              className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`}
            />
          )}
          {title}
        </h2>

        {highlight && <div className="mt-3">{highlight}</div>}

        <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</div>

        <div className="mt-6 flex justify-center gap-2">
          <Button ref={cancelRef} variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isCountingDown || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCountingDown ? (
              `${confirmLabel} (${secondsLeft})`
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
