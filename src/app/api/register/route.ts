import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerAndPersistSession } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// =============================================================================
// POST /api/register (Next BFF)
// =============================================================================
// Cria a conta no back e já monta a sessão iron-session — mesmo padrão do
// /api/login. Sem etapa de confirmação de email (back não suporta ainda).
// =============================================================================

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: 'Payload inválido.' }, { status: 400 });
  }

  const result = await registerAndPersistSession(parsed.email, parsed.password);

  if (!result.ok) {
    if (result.status === 400) {
      const message =
        typeof result.body === 'object' && result.body && 'message' in result.body
          ? String((result.body as { message: unknown }).message)
          : 'Não foi possível criar a conta.';
      return NextResponse.json({ message }, { status: 400 });
    }
    if (result.status === 429) {
      return NextResponse.json(
        { message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { message: 'Não foi possível criar a conta agora. Tente novamente.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ username: result.data.username }, { status: 200 });
}
