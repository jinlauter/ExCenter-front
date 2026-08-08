// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// A rota é BFF: mockamos as dependências server-only (o helper de troca de senha e o guarda CSRF)
// e exercitamos o contrato do handler — 204 no sucesso, mapeamento de erro, e que a validação
// barra antes de tocar no back. vi.hoisted porque vi.mock sobe acima das declarações.
const mocks = vi.hoisted(() => {
  class BackendError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown) { super('backend'); this.status = status; this.body = body; }
  }
  class UnauthenticatedError extends Error {}
  return { change: vi.fn(), BackendError, UnauthenticatedError };
});

vi.mock('@/lib/backend', () => ({
  changePasswordAndPersistSession: mocks.change,
  BackendError: mocks.BackendError,
  UnauthenticatedError: mocks.UnauthenticatedError,
}));
vi.mock('@/lib/csrf', () => ({ rejectCrossSite: vi.fn().mockResolvedValue(null) }));

import { PUT } from '../route';

function req(body: unknown) {
  return new Request('http://localhost/api/users/password', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/users/password (BFF)', () => {
  beforeEach(() => mocks.change.mockReset());

  // O coração da fatia: trocar a senha reemite a sessão (revogando as demais) e o handler
  // responde 204 — o Set-Cookie da sessão nova viaja nessa resposta.
  it('sucesso: troca a senha reemitindo a sessão e responde 204', async () => {
    mocks.change.mockResolvedValue(undefined);

    const res = await PUT(req({ currentPassword: 'atual1234', newPassword: 'novaSenha123' }));

    expect(res.status).toBe(204);
    expect(mocks.change).toHaveBeenCalledWith('atual1234', 'novaSenha123');
  });

  it('nova senha curta: 400 sem chamar o back (a reemissão nem é tentada)', async () => {
    const res = await PUT(req({ currentPassword: 'atual1234', newPassword: 'curta' }));

    expect(res.status).toBe(400);
    expect(mocks.change).not.toHaveBeenCalled();
  });
});
