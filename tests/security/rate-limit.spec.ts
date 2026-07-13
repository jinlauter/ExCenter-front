import { test, expect } from '@playwright/test';
import { FRONT_URL, BACK_URL } from './helpers';

/**
 * Confirma o rate limit do back: 5 tentativas de login/min/IP. Sexta vira 429.
 *
 * Importante: testa direto no back (não via Next) porque o rate limit é
 * aplicado no .NET. O Next só repassa. Se rodasse via Next, contava certo
 * mesmo assim, mas isolar no back deixa o teste mais claro.
 *
 * Este teste vai disparar o rate limit do seu IP no back por 1 minuto após
 * executar. Outros testes que dependam de login vão falhar se rodarem em
 * seguida. Por isso playwright.config.ts está com fullyParallel=false.
 */

test.describe('Rate limit no login', () => {
  test('6ª tentativa em < 1min vira 429', async ({ request }) => {
    const credentials = { username: `nonexistent-${Date.now()}`, password: 'wrong' };

    // 5 tentativas — todas devem retornar 401 (credenciais inválidas)
    for (let i = 1; i <= 5; i++) {
      const res = await request.post(`${BACK_URL}/api/auth/login`, {
        data: credentials,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status(), `Tentativa ${i} deveria ser 401`).toBe(401);
    }

    // 6ª tentativa — deve ser 429
    const sixth = await request.post(`${BACK_URL}/api/auth/login`, {
      data: credentials,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(sixth.status(), 'Sexta tentativa deveria ser 429 (rate limit)').toBe(429);
  });

  test('rate limit não afeta GET /api/auth/me (rota diferente)', async ({ request }) => {
    // O rate limit é específico da rota de login. GET /me sem auth deve dar 401,
    // não 429 — independente de quantas vezes login foi tentado.
    const res = await request.get(`${BACK_URL}/api/auth/me`);
    expect([401]).toContain(res.status());
  });
});
