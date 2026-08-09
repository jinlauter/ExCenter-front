'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Checkout SIMULADO — protótipo. Não coleta nem processa pagamento real; deixa isso explícito na
// tela. O fluxo real (waitlist / cadastro / pagamento) está no BACKLOG do back, ainda a decidir.
export interface CheckoutPlan {
  name: string;
  desc: string;
  priceLabel: string;
  cycleLabel: string;
}

export function CheckoutModal({ plan, onClose }: { plan: CheckoutPlan; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Fechar" className="absolute inset-0 cursor-default bg-primary-dark/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-input bg-card p-7 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-input text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {!confirmed ? (
          <>
            <span className="mb-4 inline-block rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              ◆ Checkout de demonstração — nenhum pagamento real
            </span>
            <h3 className="text-xl font-semibold">Assinar {plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>

            <div className="mt-5 flex items-center justify-between border-t border-border py-3 text-sm">
              <span>
                Plano {plan.name} · {plan.cycleLabel}
              </span>
              <span>{plan.priceLabel}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border py-3 text-sm font-semibold">
              <span>Total hoje</span>
              <span className="text-lg">{plan.priceLabel}</span>
            </div>

            <div className="my-4 flex items-center gap-2 rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Cartão de teste <span className="font-mono text-foreground">•••• 4242</span>
              <span className="ml-auto text-xs">demo</span>
            </div>

            <Button className="w-full" onClick={() => setConfirmed(true)}>
              Confirmar assinatura (simulação)
            </Button>
          </>
        ) : (
          <div className="py-3 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary-light text-primary">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold">Assinatura confirmada!</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
              Isto é uma simulação — nenhum pagamento foi processado. No app real, você já cairia
              direto no envio do primeiro exame.
            </p>
            <Button variant="outline" className="mt-5 w-full" onClick={onClose}>
              Perfeito
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
