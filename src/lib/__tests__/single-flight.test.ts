import { describe, expect, it, vi, afterEach } from 'vitest';
import { singleFlight } from '@/lib/single-flight';

afterEach(() => {
  vi.useRealTimers();
});

describe('singleFlight — dedupe da renovação de sessão', () => {
  // O caso que destruía sessão válida: dois requests concorrentes, mesmo refresh token.
  it('chamadas concorrentes com a mesma chave compartilham UMA execução', async () => {
    const map = new Map<string, Promise<string>>();
    const fn = vi.fn(async () => 'renovado');

    const [a, b, c] = await Promise.all([
      singleFlight(map, 'token-antigo', fn),
      singleFlight(map, 'token-antigo', fn),
      singleFlight(map, 'token-antigo', fn),
    ]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual(['renovado', 'renovado', 'renovado']);
  });

  // O retardatário: chega DEPOIS de a renovação resolver, ainda com o token antigo na mão.
  // Sem a retenção, ele executaria fn de novo — queimando um token já rotacionado.
  it('dentro da janela de retenção, chamada posterior reaproveita o resultado', async () => {
    vi.useFakeTimers();
    const map = new Map<string, Promise<string>>();
    const fn = vi.fn(async () => 'renovado');

    await singleFlight(map, 'token-antigo', fn, 10_000);
    vi.advanceTimersByTime(5_000); // ainda dentro da retenção
    const tardio = await singleFlight(map, 'token-antigo', fn, 10_000);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(tardio).toBe('renovado');
  });

  it('depois da retenção, a chave é liberada e fn roda de novo', async () => {
    vi.useFakeTimers();
    const map = new Map<string, Promise<string>>();
    const fn = vi.fn(async () => 'renovado');

    await singleFlight(map, 'token-antigo', fn, 10_000);
    await vi.advanceTimersByTimeAsync(10_001);
    await singleFlight(map, 'token-antigo', fn, 10_000);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(map.size).toBe(1); // a entrada velha foi removida; só a nova retida
  });

  it('chaves diferentes executam independentes', async () => {
    const map = new Map<string, Promise<string>>();
    const fn = vi.fn(async () => 'x');

    await Promise.all([singleFlight(map, 'token-a', fn), singleFlight(map, 'token-b', fn)]);

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
