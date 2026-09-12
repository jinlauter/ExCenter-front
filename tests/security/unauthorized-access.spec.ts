import { test, expect } from '@playwright/test';
import { FRONT_URL } from './helpers';

/**
 * Confirma as duas travas de rota do proxy do Next (src/proxy.ts, o antigo middleware):
 * rota protegida sem sessão vai pro /login, e a raiz troca de destino conforme haja sessão.
 */

// Espelha PROTECTED_PREFIXES do src/proxy.ts.
const PROTECTED_ROUTES = ['/home', '/exames-enviados', '/resultados', '/configuracoes'];

// O proxy roda no Edge e só checa PRESENÇA do cookie — não descriptografa a iron-session (ver o
// comentário no topo do src/proxy.ts). Um valor falso exercita exatamente a regra que interessa,
// sem depender do back emitir sessão de verdade.
const FAKE_SESSION_COOKIE = {
  name: 'excenter-session',
  value: 'presenca-basta-o-proxy-nao-descriptografa',
  url: FRONT_URL,
};

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

  // A raiz é pública: sem sessão ela ENTREGA a landing de vendas, não manda pro login. Quem
  // tiver sessão é que nunca a vê — o proxy desvia pro /home antes de renderizar (ver
  // ROUTES_REDIRECTED_WHEN_SIGNED_IN).
  test('GET / (rota raiz) sem sessão → 200 com a landing, sem redirect', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Todos os seus exames');
  });

  test('GET / (rota raiz) COM sessão → 307 para /home', async ({ context }) => {
    await context.addCookies([FAKE_SESSION_COOKIE]);

    // Sem seguir o redirect: o /home valida a sessão pra valer e rebateria o cookie falso de
    // volta pro /login. O que se afirma aqui é o 307 que o proxy emite na raiz.
    const response = await context.request.get('/', { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    const location = response.headers()['location'];
    expect(location, 'Location header deve existir no 307').toBeTruthy();
    if (!location) throw new Error('unreachable');
    expect(new URL(location, FRONT_URL).pathname).toBe('/home');
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
