import { NextResponse } from 'next/server';
import { z } from 'zod';
import { changePasswordAndPersistSession, BackendError, UnauthenticatedError } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// PUT /api/users/password (Next BFF) → PUT /api/users/me/password.
// O back reemite a sessão (troca de senha revoga as demais); aqui regravamos o cookie com os
// tokens novos, senão este mesmo dispositivo cairia no próximo refresh com o token já invalidado.
// O 204 devolvido carrega o Set-Cookie da sessão nova.

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
    await changePasswordAndPersistSession(parsed.currentPassword, parsed.newPassword);
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
