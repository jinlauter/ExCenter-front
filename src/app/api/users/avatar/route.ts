import { NextResponse } from 'next/server';
import { backendFetchRaw, UnauthenticatedError } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// BFF da foto de perfil: o browser só conhece esta rota same-origin. O bucket
// R2 continua privado e o Bearer token nunca sai do servidor Next.
export async function GET() {
  try {
    const response = await backendFetchRaw('/api/users/me/avatar', { method: 'GET' });
    if (!response.ok) {
      return NextResponse.json({ message: 'Foto de perfil não encontrada.' }, { status: response.status });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Não foi possível carregar a foto.' }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  let avatar: File | null;
  try {
    const formData = await request.formData();
    const candidate = formData.get('avatar');
    avatar = candidate instanceof File ? candidate : null;
  } catch {
    avatar = null;
  }

  if (!avatar) return NextResponse.json({ message: 'Nenhuma foto enviada.' }, { status: 400 });

  const formData = new FormData();
  formData.append('avatar', avatar, avatar.name);

  try {
    const response = await backendFetchRaw('/api/users/me/avatar', { method: 'PUT', body: formData });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Não foi possível salvar a foto.' }, { status: 502 });
  }
}

export async function DELETE() {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  try {
    const response = await backendFetchRaw('/api/users/me/avatar', { method: 'DELETE' });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Não foi possível remover a foto.' }, { status: 502 });
  }
}
