import { NextResponse } from 'next/server';
import { z } from 'zod';
import { backendFetch, BackendError, UnauthenticatedError } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// PUT /api/users/password (Next BFF) → PUT /api/users/me/password → 204

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
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
    await backendFetch<undefined>('/api/users/me/password', {
      method: 'PUT',
      body: parsed,
    });
    return new NextResponse(null, { status: 204 });
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
