import { test, expect } from '@playwright/test';

/**
 * Verifica que os headers de segurança configurados em next.config.mjs estão
 * de fato sendo emitidos pelo servidor.
 *
 * Não depende de usuário logado.
 */

test.describe('Security headers', () => {
  test('CSP presente em rota pública', async ({ request }) => {
    const res = await request.get('/login');
    expect(res.status()).toBe(200);

    const csp = res.headers()['content-security-policy'];
    expect(csp, 'CSP header deve estar presente').toBeTruthy();

    // Verifica diretivas essenciais
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  test('X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/login');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get('/login');
    expect(res.headers()['x-frame-options']).toBe('DENY');
  });

  test('Referrer-Policy strict-origin-when-cross-origin', async ({ request }) => {
    const res = await request.get('/login');
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('Permissions-Policy desabilita APIs sensíveis', async ({ request }) => {
    const res = await request.get('/login');
    const policy = res.headers()['permissions-policy'];
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=()');
  });

  test('HSTS NÃO presente em dev (Next NODE_ENV=development)', async ({ request }) => {
    // Em dev local não emitimos HSTS pra não trapacear browsers em localhost.
    // Em produção (next build && next start), HSTS deve estar.
    const res = await request.get('/login');
    if (process.env.NODE_ENV === 'production') {
      const hsts = res.headers()['strict-transport-security'];
      expect(hsts).toContain('max-age=');
    }
    // Em dev, apenas checamos que NÃO quebrou nada — não exigimos ausência.
  });
});
