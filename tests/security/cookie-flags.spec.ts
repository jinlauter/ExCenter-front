import { test, expect } from '@playwright/test';
import { loginViaAPI, skipIfNoTestUser } from './helpers';

/**
 * Confirma que o cookie de sessão emitido pelo /api/login tem as flags
 * esperadas: httpOnly, SameSite=Lax, Path=/, Secure (em produção).
 */

test.describe('Cookie de sessão — flags', () => {
  test('Cookie excenter-session tem flags corretas após login', async ({ request }) => {
    const { skip, reason } = await skipIfNoTestUser(request);
    if (skip) test.skip(true, reason);

    const res = await loginViaAPI(request);
    expect(res.status()).toBe(200);

    // Headers do response trazem Set-Cookie raw
    const setCookieHeader = res.headers()['set-cookie'];
    expect(setCookieHeader, 'Set-Cookie header deve existir').toBeTruthy();
    if (!setCookieHeader) throw new Error('unreachable');

    expect(setCookieHeader).toContain('excenter-session=');

    const lower = setCookieHeader.toLowerCase();
    expect(lower).toContain('httponly');
    expect(lower).toContain('samesite=lax');
    expect(lower).toContain('path=/');

    // Em dev local sem TLS, Secure não vai. Em produção (NODE_ENV=production), sim.
    if (process.env.NODE_ENV === 'production') {
      expect(lower).toContain('secure');
    }
  });
});
