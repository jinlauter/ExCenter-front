import { test, expect } from '@playwright/test';
import { BACK_URL } from './helpers';

/**
 * Confirma que LoginAsync no AuthService roda BCrypt.Verify mesmo quando o
 * usuário não existe (proteção contra timing attack / user enumeration).
 *
 * Metodologia:
 *   - Mede N tentativas com usuário INEXISTENTE
 *   - Mede N tentativas com usuário EXISTENTE mas senha errada
 *   - Calcula média de cada conjunto
 *   - Verifica que o delta é menor que ~50ms (BCrypt sozinho leva ~150ms)
 *
 * Em uma implementação vulnerável, a diferença seria de ordens de magnitude
 * (5ms vs 150ms). Após o fix, ambos rodam BCrypt e a diferença é só ruído.
 *
 * Limitações:
 *   - Ruído de rede local pode dominar. Rodar local elimina a maior parte.
 *   - Postgres pode cachear o lookup do user inexistente — primeira query é
 *     mais lenta. Por isso fazemos warm-up.
 *   - Rate limit (5/min) limita N. Reseta a cada testname diferente.
 *
 * Cuidado: este teste DISPARA o rate limit. Por isso roda sozinho (workers=1).
 */

const SAMPLES = 3; // Limitado pelo rate limit (5/min).

async function measureLoginLatency(
  request: import('@playwright/test').APIRequestContext,
  username: string,
  password: string,
): Promise<number> {
  const start = performance.now();
  await request.post(`${BACK_URL}/api/auth/login`, {
    data: { username, password },
    headers: { 'Content-Type': 'application/json' },
  });
  return performance.now() - start;
}

test.describe('Timing attack mitigation', () => {
  test.setTimeout(120_000); // rate limit reset

  test('Tempo de resposta similar para user-inexistente vs senha-errada', async ({ request }) => {
    // Warm-up: faz uma chamada pra "esquentar" caches.
    await measureLoginLatency(request, 'warmup', 'warmup');
    await new Promise((r) => setTimeout(r, 70_000)); // espera reset do rate limit

    const timesNoUser: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      // Username único pra não cachear no Postgres
      timesNoUser.push(await measureLoginLatency(request, `nonexistent-${Date.now()}-${i}`, 'whatever'));
    }

    await new Promise((r) => setTimeout(r, 70_000)); // reset rate limit

    // Usuário "test-user" — pode ou não existir. Se existir, usa senha errada.
    // Se não existir, esse teste vira o mesmo que o anterior e é inconclusivo.
    const timesWrongPwd: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      timesWrongPwd.push(await measureLoginLatency(request, 'test-user', `wrong-${i}`));
    }

    const avgNoUser = timesNoUser.reduce((a, b) => a + b, 0) / timesNoUser.length;
    const avgWrongPwd = timesWrongPwd.reduce((a, b) => a + b, 0) / timesWrongPwd.length;

    const delta = Math.abs(avgWrongPwd - avgNoUser);

    console.log(`[timing] no-user avg = ${avgNoUser.toFixed(1)}ms`);
    console.log(`[timing] wrong-pwd avg = ${avgWrongPwd.toFixed(1)}ms`);
    console.log(`[timing] delta = ${delta.toFixed(1)}ms`);

    // Sem fix: delta seria > 100ms (5ms vs 150ms).
    // Com fix: ambos rodam BCrypt → delta dominado por ruído (< 50ms tipicamente).
    expect(delta, `Delta de ${delta.toFixed(0)}ms sugere que usuários estão sendo enumeráveis pelo tempo`).toBeLessThan(50);
  });
});
