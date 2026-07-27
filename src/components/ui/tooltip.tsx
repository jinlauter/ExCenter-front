'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Tooltip discreto, inspirado no Material UI. Funciona inclusive sobre <button disabled>,
// pois hover/foco são capturados pelo wrapper.
//
// Duas decisões estruturais, ambas vindas de defeitos vistos em tela:
//
// 1. A bolha só entra no DOM enquanto visível. Sempre presente (mesmo com opacity-0), ela
//    estendia a área rolável da tabela de resultados, criando uma barra de rolagem
//    horizontal fantasma — e leitores de tela anunciavam tooltips que ninguém pairou.
//
// 2. A bolha renderiza num PORTAL (document.body) com posição fixa calculada, não absoluta
//    dentro do gatilho. Dentro de um contêiner overflow-x-auto (a grid), qualquer
//    posicionamento absoluto é cortado na borda do contêiner — num notebook, a lista de
//    exames incluídos morria cortada no meio. O portal ignora o overflow, e o clamp
//    garante que a bolha nunca vaza da viewport.
const SHOW_DELAY_MS = 300;
const GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;

export function Tooltip({
  content,
  children,
  className,
  placement = 'top',
}: {
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?: 'top' | 'right';
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => () => clearTimeout(showTimer.current), []);

  // Mede gatilho + bolha DEPOIS de renderizar (fora da tela) e posiciona antes do paint —
  // sem flash. Clamp mantém a bolha inteira dentro da viewport, vire o que vier.
  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    const bubble = bubbleRef.current?.getBoundingClientRect();
    if (!trigger || !bubble) return;

    let left: number;
    let top: number;
    if (placement === 'right') {
      left = trigger.right + GAP_PX;
      top = trigger.top + trigger.height / 2 - bubble.height / 2;
    } else {
      left = trigger.left + trigger.width / 2 - bubble.width / 2;
      top = trigger.top - GAP_PX - bubble.height;
    }

    left = Math.max(VIEWPORT_PADDING_PX, Math.min(left, window.innerWidth - bubble.width - VIEWPORT_PADDING_PX));
    top = Math.max(VIEWPORT_PADDING_PX, Math.min(top, window.innerHeight - bubble.height - VIEWPORT_PADDING_PX));
    setPos({ left, top });
  }, [visible, placement]);

  // Posição fixa fica errada se a página rolar com a bolha aberta — esconder é mais simples
  // e mais correto que re-calcular (o mouse saiu do lugar de qualquer jeito).
  useEffect(() => {
    if (!visible) return;
    const hideOnMove = () => hide();
    window.addEventListener('scroll', hideOnMove, true);
    window.addEventListener('resize', hideOnMove);
    return () => {
      window.removeEventListener('scroll', hideOnMove, true);
      window.removeEventListener('resize', hideOnMove);
    };
  }, [visible]);

  if (!content) return <>{children}</>;

  function scheduleShow() {
    clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
  }

  function hide() {
    clearTimeout(showTimer.current);
    setVisible(false);
    setPos(null);
  }

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={scheduleShow}
      onMouseLeave={hide}
      onFocus={scheduleShow}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            className={cn(
              'pointer-events-none z-[70] w-max max-w-[260px] rounded-[4px] bg-[#5f5f5f]/95 px-2.5 py-1 text-[11px] font-normal leading-snug text-white shadow-sm motion-safe:animate-[tooltip-in_120ms_ease-out]',
              placement === 'top' ? 'text-center' : 'text-left',
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
