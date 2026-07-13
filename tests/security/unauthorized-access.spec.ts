import { test, expect } from '@playwright/test';

/**
 * Confirma que rotas protegidas redirecionam pra /login quando não há sessão.
 * O middleware do Next (src/middleware.ts) é o responsável por isso.
 */

const PROTECTED_ROUTES = ['/home', '/exames-enviados', '/historico'];

test.describe('Proteção de rotas autenticadas', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`GET ${route} sem sessão → redireciona para /login`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Next devolve 307 redirect. Playwright segue automaticamente.
      // Conferimos a URL final.
      expect(page.url()).toContain('/login');
      // Verifica preservação do destino original via query param
      if (response) {
        const url = new URL(page.url());
        expect(url.searchParams.get('from')).toBe(route);
      }
    });
  }

  test('GET / (rota raiz) sem sessão → vai para /login', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toContain('/login');
  });
});

test.describe('Route handlers exigem sessão', () => {
  test('GET /api/me sem sessão → 401', async ({ request }) => {
    const res = await request.get('/api/me', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/bloodtests/upload sem sessão → 401', async ({ request }) => {
    const form = new FormData();
    form.set('files', new Blob(['fake-pdf'], { type: 'application/pdf' }), 'test.pdf');

    const res = await request.post('/api/bloodtests/upload', {
      multipart: { files: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake') } },
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.status()).toBe(401);
  });
});
