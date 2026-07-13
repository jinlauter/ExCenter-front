import { test, expect } from '@playwright/test';
import { FRONT_URL } from './helpers';

/**
 * Confirma que route handlers que alteram estado rejeitam requests com
 * Origin diferente do Host (proteção CSRF além do SameSite=Lax).
 */

const MUTATING_ROUTES = [
  { path: '/api/login', body: JSON.stringify({ username: 'x', password: 'y' }), type: 'application/json' },
  { path: '/api/logout', body: '', type: 'application/json' },
  // /api/bloodtests/upload precisa de multipart; pulado neste suite porque
  // o requireSameOrigin roda ANTES do parse de FormData, então testar com
  // body JSON dummy também dispara o 403 e cobre o caminho.
  { path: '/api/bloodtests/upload', body: '', type: 'multipart/form-data; boundary=test' },
];

test.describe('CSRF protection', () => {
  for (const route of MUTATING_ROUTES) {
    test(`POST ${route.path} com Origin cross-site → 403`, async ({ request }) => {
      const res = await request.post(`${FRONT_URL}${route.path}`, {
        data: route.body,
        headers: {
          'Content-Type': route.type,
          Origin: 'https://attacker.example.com',
        },
      });

      expect(
        res.status(),
        `${route.path} deveria responder 403 a cross-origin POST mas respondeu ${res.status()}`,
      ).toBe(403);
    });
  }

  test('POST sem Origin e sem Sec-Fetch-Site → 403', async ({ request }) => {
    // Sem nenhum header de origem, o requireSameOrigin não consegue confirmar
    // same-origin e bloqueia (postura conservadora).
    const res = await request.post(`${FRONT_URL}/api/login`, {
      data: JSON.stringify({ username: 'x', password: 'y' }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(403);
  });

  test('POST com Sec-Fetch-Site: same-origin mas sem Origin → permitido (passa pra 401)', async ({
    request,
  }) => {
    // Quando Origin não vai mas o browser indica same-origin via Sec-Fetch-Site,
    // requireSameOrigin aceita. O 401 vem do AuthService porque credenciais inválidas.
    const res = await request.post(`${FRONT_URL}/api/login`, {
      data: JSON.stringify({ username: 'nonexistent-user', password: 'wrong' }),
      headers: {
        'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    expect(res.status()).toBe(401);
  });

  test('POST com Origin = mesma do Host → permitido', async ({ request }) => {
    const res = await request.post(`${FRONT_URL}/api/login`, {
      data: JSON.stringify({ username: 'nonexistent-user', password: 'wrong' }),
      headers: {
        'Content-Type': 'application/json',
        Origin: FRONT_URL,
      },
    });

    // Credenciais inválidas, mas passou pelo CSRF check.
    expect(res.status()).toBe(401);
  });
});
