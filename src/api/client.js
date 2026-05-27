import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore.js';

// ============================================================================
// Cliente HTTP da API ExCenter
// ============================================================================
// Convenções obrigatórias pelo back (ver AuthDtos.cs / AuthController.cs):
//   - withCredentials: true  → necessário para envio do cookie httpOnly
//     refresh_token cross-origin (login / refresh / logout)
//   - Header Authorization: Bearer {accessToken} em toda chamada autenticada
//   - Em 401: tentar POST /api/auth/refresh uma vez. Se falhar, deslogar.
// ============================================================================

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5287';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Injeta o access token em cada request.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh em 401 ──────────────────────────────────────────────────────
//
// Quando o access token expira, o back devolve 401. A gente tenta UMA vez
// chamar /auth/refresh (que usa o cookie httpOnly). Se conseguir, reexecuta
// a request original com o novo token. Se falhar, limpa o token e deixa o
// erro propagar para o AuthContext redirecionar pro /login.

let refreshPromise = null;

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(`${baseURL}/api/auth/refresh`, null, { withCredentials: true })
    .then((res) => {
      const { accessToken, expiresAt } = res.data;
      setAccessToken(accessToken, expiresAt);
      return accessToken;
    })
    .catch((err) => {
      clearAccessToken();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Não tentar refresh em chamadas do próprio /auth (evita loop infinito)
    const isAuthRoute = original?.url?.includes('/api/auth/');

    if (status === 401 && !isAuthRoute && !original._retry) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // refresh falhou — propaga 401 original; AuthContext desloga
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
