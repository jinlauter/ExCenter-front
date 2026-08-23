'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const SHOW_DELAY_MS = 100;
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
  const [openedByTouch, setOpenedByTouch] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressMouseRef = useRef(false);
  const touchMovedRef = useRef(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => () => clearTimeout(showTimer.current), []);

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

  const hide = useCallback(() => {
    clearTimeout(showTimer.current);
    setVisible(false);
    setPos(null);
    setOpenedByTouch(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [visible, hide]);

  // Touch: fechar ao tocar fora do gatilho ou da bolha.
  useEffect(() => {
    if (!visible || !openedByTouch) return;
    function handleOutside(e: TouchEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        (!bubbleRef.current || !bubbleRef.current.contains(target))
      ) {
        hide();
      }
    }
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => document.removeEventListener('touchstart', handleOutside);
  }, [visible, openedByTouch, hide]);

  if (!content) return <>{children}</>;

  function scheduleShow() {
    if (suppressMouseRef.current || openedByTouch) return;
    clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
  }

  function handleMouseLeave() {
    if (suppressMouseRef.current || openedByTouch) return;
    hide();
  }

  function handleTouchEnd() {
    if (touchMovedRef.current) return;

    suppressMouseRef.current = true;
    setTimeout(() => { suppressMouseRef.current = false; }, 500);

    clearTimeout(showTimer.current);
    if (visible) {
      hide();
    } else {
      setOpenedByTouch(true);
      setVisible(true);
    }
  }

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline-flex select-none', className)}
      style={{ touchAction: 'manipulation' }}
      onMouseEnter={scheduleShow}
      onMouseLeave={handleMouseLeave}
      onFocus={scheduleShow}
      onBlur={handleMouseLeave}
      onTouchStart={() => { touchMovedRef.current = false; }}
      onTouchMove={() => { touchMovedRef.current = true; }}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {visible &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            className={cn(
              'z-[70] w-max max-w-[260px] rounded-[4px] bg-[#5f5f5f]/95 px-2.5 py-1 text-[11px] font-normal leading-snug text-white shadow-sm motion-safe:animate-[tooltip-in_120ms_ease-out]',
              !openedByTouch && 'pointer-events-none',
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
