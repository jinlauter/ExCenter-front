import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — testes E2E de segurança.
 *
 * Pré-requisitos:
 *   - Back .NET rodando em http://localhost:5287
 *   - Next dev rodando em http://localhost:3000 (subido automaticamente pelo webServer abaixo)
 *
 * Para criar usuário de teste (uma vez):
 *   1. POST http://localhost:5287/api/auth/dev/hash com body "test-password-123" → recebe hash
 *   2. INSERT INTO "Users" (Id, Username, PasswordHash, CreatedAt)
 *      VALUES (gen_random_uuid(), 'test-user', '<hash>', NOW());
 *
 * Rodar:
 *   npm run test:security           # headless
 *   npm run test:security:ui        # UI mode (debug)
 */

const FRONT_URL = process.env.E2E_FRONT_URL ?? 'http://localhost:3000';
const BACK_URL = process.env.E2E_BACK_URL ?? 'http://localhost:5287';

export default defineConfig({
  testDir: './tests/security',
  fullyParallel: false, // alguns testes (rate limit, timing) NÃO podem rodar paralelo
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: FRONT_URL,
    trace: 'retain-on-failure',
    extraHTTPHeaders: {
      // Os testes que querem simular cross-origin sobrescrevem Origin manualmente.
    },
  },

  // Compartilha BACK_URL com os testes via globalSetup (poderia usar env direto também).
  globalSetup: undefined,

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: FRONT_URL,
    timeout: 120_000,
    reuseExistingServer: true,
    env: {
      // Garante que o Next se conecte ao back correto durante os testes.
      BACKEND_URL: BACK_URL,
    },
  },
});

export const TEST_CONFIG = {
  FRONT_URL,
  BACK_URL,
  // Credenciais usadas pelos testes que precisam logar de verdade.
  TEST_USER: {
    username: process.env.E2E_TEST_USERNAME ?? 'test-user',
    password: process.env.E2E_TEST_PASSWORD ?? 'test-password-123',
  },
};
