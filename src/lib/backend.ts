import 'server-only';

import { decodeJwt } from 'jose';
import { env } from './env';
import { getSession, type SessionData } from './session';
import type { LoginResponse } from '@/types/api';

// =============================================================================
// Backend client (BFF)
// =============================================================================
//
// Camada que TODO route handler usa para falar com o .NET. Funcionalidades:
//   - injeta Authorization: Bearer automaticamente
//   - guarda refresh token recebido no body (back devolve via campo
//     refreshToken além do cookie httpOnly)
//   - faz refresh transparente em 401 (1 tentativa)
//   - decoda o access token JWT pra extrair userId (claim "sub") na hora do
//     login, evitando uma chamada extra a /me
//   - nunca expõe tokens ao caller — só response data
//
// Importante: nada aqui é importável de client components (marcado com
// 'server-only').
// =============================================================================

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`Backend respondeu ${status}`);
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('Sessão expirada ou inválida.');
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  /** Body já serializado (string), ou objeto que vira JSON, ou FormData. */
  body?: BodyInit | object;
  /** Quando true, NÃO tenta refresh automático em 401. */
  skipRefresh?: boolean;
}

/**
 * Faz uma chamada autenticada ao back, retornando o JSON da resposta tipado.
 * Lança UnauthenticatedError se sessão estiver ausente ou expirar.
 */
export async function backendFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const session = await getSession();

  if (!session.accessToken) {
    throw new UnauthenticatedError();
  }

  let response = await callBackend(path, options, session.accessToken);

  // Se acesso negado e ainda temos refresh, tentamos renovar uma vez.
  if (response.status === 401 && !options.skipRefresh && session.refreshToken) {
    const refreshed = await tryRefresh(session);
    if (refreshed) {
      response = await callBackend(path, options, session.accessToken);
    }
  }

  if (response.status === 401) {
    session.destroy();
    throw new UnauthenticatedError();
  }

  if (!response.ok) {
    const errorBody = await safeReadBody(response);
    throw new BackendError(response.status, errorBody);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Variante para chamadas que devolvem o response cru (ex: upload multipart
 * onde queremos só o status + JSON). Mesmas garantias de refresh.
 */
export async function backendFetchRaw(
  path: string,
  options: FetchOptions = {},
): Promise<Response> {
  const session = await getSession();
  if (!session.accessToken) throw new UnauthenticatedError();

  let response = await callBackend(path, options, session.accessToken);

  if (response.status === 401 && !options.skipRefresh && session.refreshToken) {
    const refreshed = await tryRefresh(session);
    if (refreshed) {
      response = await callBackend(path, options, session.accessToken);
    }
  }

  if (response.status === 401) {
    session.destroy();
    throw new UnauthenticatedError();
  }

  return response;
}

// ── internos ────────────────────────────────────────────────────────────────

async function callBackend(
  path: string,
  options: FetchOptions,
  accessToken: string,
): Promise<Response> {
  const url = `${env.BACKEND_URL}${path}`;
  const { body, headers, skipRefresh: _skipRefresh, ...rest } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Authorization', `Bearer ${accessToken}`);

  let finalBody: BodyInit | undefined;
  if (body instanceof FormData || body instanceof ReadableStream || typeof body === 'string') {
    finalBody = body;
  } else if (body !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    finalBody = JSON.stringify(body);
  }

  return fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
    cache: 'no-store',
  });
}

/**
 * Tenta renovar o access token usando o refresh_token guardado na sessão.
 *
 * Envia o refresh via Authorization: Bearer (suporte adicionado no back para
 * exatamente este caso — clientes BFF que querem evitar cookies em outgoing
 * requests). O back devolve o novo refreshToken DIRETO NO BODY, então não
 * precisamos parsear Set-Cookie.
 */
async function tryRefresh(session: Awaited<ReturnType<typeof getSession>>): Promise<boolean> {
  if (!session.refreshToken) return false;

  const response = await fetch(`${env.BACKEND_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.refreshToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) return false;

  const data = (await response.json()) as LoginResponse;
  if (!data.refreshToken) return false;

  session.accessToken = data.accessToken;
  session.accessExpiresAt = data.expiresAt;
  session.refreshToken = data.refreshToken;
  session.refreshExpiresAt = data.refreshTokenExpiresAt;
  session.username = data.username;
  session.userId = extractUserIdFromJwt(data.accessToken) ?? session.userId;
  await session.save();

  return true;
}

/**
 * Faz login direto no back e persiste tokens na sessão.
 * Usado pela route handler /api/login.
 */
export async function loginAndPersistSession(
  username: string,
  password: string,
): Promise<{ ok: true; data: LoginResponse } | { ok: false; status: number; body: unknown }> {
  const response = await fetch(`${env.BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return { ok: false, status: response.status, body: await safeReadBody(response) };
  }

  const data = (await response.json()) as LoginResponse;
  if (!data.refreshToken) {
    return {
      ok: false,
      status: 500,
      body: {
        message: 'Resposta do back não trouxe refreshToken no body. Atualize o back para a versão BFF-compatible.',
      },
    };
  }

  await persistSessionFromLogin(data);
  return { ok: true, data };
}

/**
 * Executa o login social com Google: envia o id_token (já obtido pelo fluxo
 * OAuth no callback) ao back, que valida e devolve nossos tokens. Persiste a
 * sessão. Retorna true em sucesso.
 */
export async function googleLoginAndPersistSession(idToken: string): Promise<boolean> {
  return socialLoginAndPersistSession('google', idToken);
}

/** Versão Microsoft (Entra ID) do login social. */
export async function microsoftLoginAndPersistSession(idToken: string): Promise<boolean> {
  return socialLoginAndPersistSession('microsoft', idToken);
}

/**
 * Implementação compartilhada de login social: chama POST /api/auth/{provider}
 * do back, persiste a sessão. Trata de mais providers no futuro só adicionando
 * o nome ao tipo.
 */
async function socialLoginAndPersistSession(
  provider: 'google' | 'microsoft',
  idToken: string,
): Promise<boolean> {
  const response = await fetch(`${env.BACKEND_URL}/api/auth/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });

  if (!response.ok) return false;

  const data = (await response.json()) as LoginResponse;
  if (!data.refreshToken) return false;

  await persistSessionFromLogin(data);
  return true;
}

/** Monta e salva a sessão iron-session a partir de um LoginResponse do back. */
async function persistSessionFromLogin(data: LoginResponse): Promise<void> {
  const session = await getSession();
  session.accessToken = data.accessToken;
  session.accessExpiresAt = data.expiresAt;
  session.refreshToken = data.refreshToken!;
  session.refreshExpiresAt = data.refreshTokenExpiresAt;
  session.username = data.username;
  session.userId = extractUserIdFromJwt(data.accessToken);
  await session.save();
}

/**
 * Tira o usuário da sessão local. Notifica o back, mas não bloqueia
 * a resposta caso o back já tenha invalidado o token.
 */
export async function logoutAndClearSession(): Promise<void> {
  const session = await getSession();
  const accessToken = session.accessToken;

  // Limpa local primeiro — UX prioritária.
  session.destroy();

  if (accessToken) {
    try {
      await fetch(`${env.BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
    } catch {
      // Ignora — sessão local já foi limpa.
    }
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Decoda o JWT (SEM verificar assinatura — o back já validou ao emitir) e
 * extrai o claim "sub", que o JwtTokenService.cs coloca como user.Id.
 *
 * Retorna undefined se o token for malformado. Não jogamos exceção: usuário
 * ainda consegue usar a sessão; só o atalho de userId fica indisponível.
 */
function extractUserIdFromJwt(accessToken: string): string | undefined {
  try {
    const payload = decodeJwt(accessToken);
    const sub = payload.sub;
    return typeof sub === 'string' ? sub : undefined;
  } catch {
    return undefined;
  }
}

async function safeReadBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

export type { SessionData };
