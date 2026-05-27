// ============================================================================
// Token store em memória
// ============================================================================
// O back recomenda explicitamente (AuthDtos.cs):
//   "Armazenamento do access token: preferência → variável em memória"
//
// Manter o access token em módulo-level variable evita exposição a XSS via
// localStorage. O preço é que ao recarregar a aba o token some — mas isso é
// resolvido chamando POST /api/auth/refresh no boot (o cookie httpOnly
// `refresh_token` sobrevive ao reload e nos dá um novo access token).
// ============================================================================

let accessToken = null;
let expiresAt = null;
const listeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function getExpiresAt() {
  return expiresAt;
}

export function setAccessToken(token, expiresAtIso) {
  accessToken = token;
  expiresAt = expiresAtIso ? new Date(expiresAtIso) : null;
  listeners.forEach((cb) => cb());
}

export function clearAccessToken() {
  accessToken = null;
  expiresAt = null;
  listeners.forEach((cb) => cb());
}

export function onTokenChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
