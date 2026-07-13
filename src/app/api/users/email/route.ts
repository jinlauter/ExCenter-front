import { NextResponse } from 'next/server';
import { z } from 'zod';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';
import type { UserProfileResponse } from '@/types/api';

// PUT /api/users/email (Next BFF) → PUT /api/users/me/email

const bodySchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export async function PUT(request: Request) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: 'Payload inválido.' }, { status: 400 });
  }

  try {
    const updated = await backendFetch<UserProfileResponse>('/api/users/me/email', {
      method: 'PUT',
      body: parsed,
    });
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
