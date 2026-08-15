'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import type { ReviewActionResult } from './types';

// Server Actions em vez de rotas BFF, por camuflagem: uma rota /api/... nova seria mais um
// caminho nomeável para sondar; a action é um POST opaco para a própria página, sem endpoint
// próprio. Quem decide autorização continua sendo o BACK (única autoridade) — a action só
// repassa, e qualquer falha vira mensagem genérica sem confirmar coisa alguma.

export async function mapTermAction(termId: number, canonicalAnalyteId: number): Promise<ReviewActionResult> {
  try {
    await backendFetch<void>(`/api/admin/observed-terms/${termId}/map`, {
      method: 'POST',
      body: { canonicalAnalyteId },
    });
    revalidatePath('/zk7q');
    return { ok: true };
  } catch (err) {
    return toGenericFailure(err);
  }
}

export async function ignoreTermAction(termId: number): Promise<ReviewActionResult> {
  try {
    await backendFetch<void>(`/api/admin/observed-terms/${termId}/ignore`, { method: 'POST' });
    revalidatePath('/zk7q');
    return { ok: true };
  } catch (err) {
    return toGenericFailure(err);
  }
}

// A única distinção que o operador precisa: analito inexistente (dado dele, corrigível) versus
// "não deu" (tudo o mais). Detalhar falha de autorização aqui abriria na action o oráculo que a
// página fecha.
function toGenericFailure(err: unknown): ReviewActionResult {
  if (err instanceof BackendError && err.status === 422) {
    return { ok: false, message: 'Analito inexistente no dicionário.' };
  }
  if (err instanceof UnauthenticatedError || err instanceof BackendError) {
    return { ok: false, message: 'Não foi possível concluir a ação.' };
  }
  throw err instanceof Error ? err : new Error('Falha inesperada.');
}

// Exclusão DEFINITIVA: conta, exames e arquivos no storage. O back é quem executa a cascata
// (RLS incluída); aqui só repassamos e deixamos o 422 (auto-exclusão, conta inexistente)
// chegar com a mensagem específica — quem lê é o operador.
export async function deleteUserAction(userId: string): Promise<ReviewActionResult> {
  try {
    await backendFetch<void>(`/api/admin/users/${userId}`, { method: 'DELETE' });
    revalidatePath('/zk7q');
    return { ok: true };
  } catch (err) {
    if (err instanceof BackendError && err.status === 422) {
      const message =
        typeof err.body === 'object' && err.body && 'message' in err.body
          ? String((err.body as { message: unknown }).message)
          : 'Não foi possível excluir a conta.';
      return { ok: false, message };
    }
    if (err instanceof UnauthenticatedError || err instanceof BackendError) {
      return { ok: false, message: 'Não foi possível excluir a conta.' };
    }
    throw err instanceof Error ? err : new Error('Falha inesperada.');
  }
}

export async function createInviteAction(email: string, plan: string): Promise<import('./types').CreatedInviteResult> {
  try {
    const created = await backendFetch<{ email: string; inviteCode: string }>(
      '/api/admin/users/invites',
      { method: 'POST', body: { email, plan } },
    );
    revalidatePath('/zk7q');
    return { ok: true, email: created.email, inviteCode: created.inviteCode };
  } catch (err) {
    if (err instanceof BackendError && err.status === 422) {
      const message =
        typeof err.body === 'object' && err.body && 'message' in err.body
          ? String((err.body as { message: unknown }).message)
          : 'Não foi possível criar o convite.';
      return { ok: false, message };
    }
    if (err instanceof UnauthenticatedError || err instanceof BackendError) {
      return { ok: false, message: 'Não foi possível criar o convite.' };
    }
    throw err instanceof Error ? err : new Error('Falha inesperada.');
  }
}

// Upgrade/downgrade manual do plano de uma conta existente. O back é a autoridade: valida o plano
// e recusa (422) o desconhecido; aqui só repassamos e devolvemos a mensagem específica quando vier.
export async function updateUserPlanAction(userId: string, plan: string): Promise<ReviewActionResult> {
  try {
    await backendFetch<void>(`/api/admin/users/${userId}/plan`, {
      method: 'PUT',
      body: { plan },
    });
    revalidatePath('/zk7q');
    return { ok: true };
  } catch (err) {
    if (err instanceof BackendError && err.status === 422) {
      const message =
        typeof err.body === 'object' && err.body && 'message' in err.body
          ? String((err.body as { message: unknown }).message)
          : 'Não foi possível alterar o plano.';
      return { ok: false, message };
    }
    if (err instanceof UnauthenticatedError || err instanceof BackendError) {
      return { ok: false, message: 'Não foi possível alterar o plano.' };
    }
    throw err instanceof Error ? err : new Error('Falha inesperada.');
  }
}
