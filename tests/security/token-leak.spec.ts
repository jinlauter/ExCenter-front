import { test, expect } from '@playwright/test';
import { FRONT_URL, loginViaAPI, skipIfNoTestUser } from './helpers';

/**
 * Confirma que NENHUM token (access ou refresh) está acessível por JavaScript
 * no browser. Este é o ganho central da arquitetura BFF.
 *
 * Precisa de usuário de teste no back. Skipa silenciosamente se faltar.
 */

test.describe('Token leak prevention', () => {
  test('localStorage não contém tokens após login', async ({ page, request }) => {
    const { skip, reason } = await skipIfNoTestUser(request);
    if (skip) test.skip(true, reason);

    // Login via UI pra forçar fluxo completo
    await page.goto('/login');
    await page.fill('input#username', process.env.E2E_TEST_USERNAME ?? 'test-user');
    await page.fill('input#password', process.env.E2E_TEST_PASSWORD ?? 'test-password-123');
    await page.click('button[type=submit]');
    await page.waitForURL('**/home', { timeout: 10_000 });

    const storage = await page.evaluate(() => {
      const ls: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) ls[key] = localStorage.getItem(key) ?? '';
      }
      return ls;
    });

    const serialized = JSON.stringify(storage).toLowerCase();
    expect(serialized).not.toContain('accesstoken');
    expect(serialized).not.toContain('refreshtoken');
    expect(serialized).not.toContain('bearer');
    // Procura padrão JWT (eyJ...)
    expect(serialized).not.toMatch(/eyj[a-zA-Z0-9_-]{20,}/);
  });

  test('sessionStorage não contém tokens', async ({ page, request }) => {
    const { skip, reason } = await skipIfNoTestUser(request);
    if (skip) test.skip(true, reason);

    await page.goto('/login');
    await page.fill('input#username', process.env.E2E_TEST_USERNAME ?? 'test-user');
    await page.fill('input#password', process.env.E2E_TEST_PASSWORD ?? 'test-password-123');
    await page.click('button[type=submit]');
    await page.waitForURL('**/home', { timeout: 10_000 });

    const storage = await page.evaluate(() => {
      const ss: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) ss[key] = sessionStorage.getItem(key) ?? '';
      }
      return ss;
    });

    const serialized = JSON.stringify(storage).toLowerCase();
    expect(serialized).not.toContain('accesstoken');
    expect(serialized).not.toContain('refreshtoken');
    expect(serialized).not.toMatch(/eyj[a-zA-Z0-9_-]{20,}/);
  });

  test('document.cookie (JS-accessible) não contém tokens', async ({ page, request }) => {
    const { skip, reason } = await skipIfNoTestUser(request);
    if (skip) test.skip(true, reason);

    await page.goto('/login');
    await page.fill('input#username', process.env.E2E_TEST_USERNAME ?? 'test-user');
    await page.fill('input#password', process.env.E2E_TEST_PASSWORD ?? 'test-password-123');
    await page.click('button[type=submit]');
    await page.waitForURL('**/home', { timeout: 10_000 });

    // document.cookie só mostra cookies que NÃO são httpOnly.
    const visibleCookies = await page.evaluate(() => document.cookie);

    // O cookie excenter-session DEVE ser httpOnly — então NÃO deve aparecer aqui.
    expect(visibleCookies.toLowerCase()).not.toContain('excenter-session');
    expect(visibleCookies.toLowerCase()).not.toContain('accesstoken');
    expect(visibleCookies.toLowerCase()).not.toContain('refreshtoken');
  });

  test('response do POST /api/login NÃO contém accessToken/refreshToken', async ({ request }) => {
    const { skip, reason } = await skipIfNoTestUser(request);
    if (skip) test.skip(true, reason);

    const res = await loginViaAPI(request);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).not.toHaveProperty('accessToken');
    expect(body).not.toHaveProperty('refreshToken');
    expect(body).not.toHaveProperty('access_token');
    expect(body).not.toHaveProperty('refresh_token');

    // Só deve ter username
    expect(body).toHaveProperty('username');
  });

  test('GET /api/session NÃO retorna tokens', async ({ request }) => {
    const { skip, reason } = await skipIfNoTestUser(request);
    if (skip) test.skip(true, reason);

    await loginViaAPI(request); // estabelece sessão no contexto

    const res = await request.get(`${FRONT_URL}/api/session`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).not.toHaveProperty('accessToken');
    expect(body).not.toHaveProperty('refreshToken');
  });
});
