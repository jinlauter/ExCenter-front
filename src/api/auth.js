import { api } from './client.js';
import { setAccessToken, clearAccessToken } from './tokenStore.js';

// ============================================================================
// API de autenticação — mapeada de AuthController.cs
// ============================================================================
// POST /api/auth/login   → 200 { accessToken, expiresAt, username } | 401 | 429
// POST /api/auth/refresh → 200 { accessToken, expiresAt, username } | 401
// POST /api/auth/logout  → 204
// GET  /api/auth/me      → 200 { userId, username }                  | 401
// ============================================================================

export async function login(username, password) {
  const { data } = await api.post('/api/auth/login', { username, password });
  setAccessToken(data.accessToken, data.expiresAt);
  return data; // { accessToken, expiresAt, username }
}

// Boot: tenta restaurar a sessão usando o cookie refresh_token httpOnly.
// Se o usuário recarregou a aba, o cookie sobrevive e a gente recupera o token.
// Se não há sessão válida, devolve null silenciosamente.
export async function tryRestoreSession() {
  try {
    const { data } = await api.post('/api/auth/refresh');
    setAccessToken(data.accessToken, data.expiresAt);
    return data;
  } catch {
    clearAccessToken();
    return null;
  }
}

export async function me() {
  const { data } = await api.get('/api/auth/me');
  return data; // { userId, username }
}

export async function logout() {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // Mesmo se falhar (token já expirado, etc), descartamos sessão local.
    // Recomendação explícita do back em AuthController.cs.
  } finally {
    clearAccessToken();
  }
}
