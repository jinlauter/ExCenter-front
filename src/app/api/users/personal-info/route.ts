import { NextResponse } from 'next/server';
import { z } from 'zod';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { getSession } from '@/lib/session';
import { rejectCrossSite } from '@/lib/csrf';
import type { UpdatePersonalInfoRequest, UserProfileResponse } from '@/types/api';

// =============================================================================
// PUT /api/users/personal-info (Next BFF) → PUT /api/users/me/personal-info
// =============================================================================
// Além de repassar pro back, atualiza o username cacheado na sessão — o
// GET /api/auth/me (e portanto a Sidebar) lê o username das claims do JWT, que
// só é renovado no próximo login/refresh. Sem isso, o nome ficaria
// desatualizado na sessão até o token expirar.
// =============================================================================

const bodySchema = z.object({
  username: z.string().min(1),
  dateOfBirth: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  biologicalSex: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  let parsed: UpdatePersonalInfoRequest;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: 'Payload inválido.' }, { status: 400 });
  }

  try {
    const updated = await backendFetch<UserProfileResponse>('/api/users/me/personal-info', {
      method: 'PUT',
      body: parsed,
    });

    const session = await getSession();
    session.username = updated.username;
    await session.save();

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    if (err instanceof BackendError && err.status === 400) {
      return NextResponse.json(err.body, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Não foi possível salvar. Tente novamente.' },
      { status: 502 },
    );
  }
}
