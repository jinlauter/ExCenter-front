import { type Page, type APIRequestContext, expect } from '@playwright/test';

export const FRONT_URL = process.env.E2E_FRONT_URL ?? 'http://localhost:3000';
export const BACK_URL = process.env.E2E_BACK_URL ?? 'http://localhost:5287';

export const TEST_USER = {
  username: process.env.E2E_TEST_USERNAME ?? 'test-user',
  password: process.env.E2E_TEST_PASSWORD ?? 'test-password-123',
};

/** Loga usando a UI do Next (cookie de sessão fica salvo no contexto). */
export async function loginViaUI(page: Page, credentials = TEST_USER) {
  await page.goto('/login');
  await page.fill('input#username', credentials.username);
  await page.fill('input#password', credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/home', { timeout: 10_000 }),
    page.click('button[type=submit]'),
  ]);
}

/** Loga via POST direto pra route handler (sem ir pela UI). */
export async function loginViaAPI(request: APIRequestContext, credentials = TEST_USER) {
  const res = await request.post(`${FRONT_URL}/api/login`, {
    data: credentials,
    headers: {
      'Content-Type': 'application/json',
      Origin: FRONT_URL,
    },
  });
  return res;
}

/**
 * Verifica se um teste precisa de usuário cadastrado no back. Se a chamada
 * de login responder 401 com username válido, marca o teste como skipped.
 */
export async function skipIfNoTestUser(request: APIRequestContext) {
  const res = await loginViaAPI(request);
  if (res.status() === 401) {
    return {
      skip: true,
      reason: `Usuário de teste "${TEST_USER.username}" não existe no back. Ver tests/security/README.md.`,
    };
  }
  return { skip: false, reason: '' };
}
