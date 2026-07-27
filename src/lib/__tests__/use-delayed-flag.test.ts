import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDelayedFlag } from '@/lib/use-delayed-flag';

// Fake timers confinados a este arquivo (vitest isola por arquivo) — usá-los junto com
// userEvent na suíte da tela travava os testes seguintes.
afterEach(() => {
  vi.useRealTimers();
});

describe('useDelayedFlag', () => {
  it('não liga antes do atraso', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDelayedFlag(true, 200));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe(false);
  });

  it('liga ao completar o atraso', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDelayedFlag(true, 200));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  // O caso que motiva o hook: operação rápida não pode acender o indicador nem por um quadro.
  it('operação que termina antes do atraso nunca liga', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });
    rerender({ active: false });

    expect(result.current).toBe(false);

    // E o timer pendente não pode "vazar" e ligar depois que já acabou.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(false);
  });

  // Desligar é imediato de propósito: atrasar também deixaria o indicador na tela depois de
  // os dados já terem chegado.
  it('desliga na hora quando a operação termina', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
  });

  it('uma segunda operação recomeça a contagem do zero', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ active: false });
    rerender({ active: true });

    expect(result.current).toBe(false); // não herda o "ligado" da operação anterior

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);
  });

  it('inativo desde o início nunca liga', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDelayedFlag(false, 200));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(false);
  });
});
