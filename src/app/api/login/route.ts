import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginAndPersistSession } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// =============================================================================
// POST /api/login (Next BFF)
// =============================================================================
// Recebe credenciais do browser, autentica contra o .NET, monta a sessão
// iron-session. O browser recebe APENAS o cookie de sessão criptografado.
// =============================================================================

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(true),
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

  const result = await loginAndPersistSession(parsed.username, parsed.password, parsed.remember);

  if (!result.ok) {
    if (result.status === 401) {
      return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
    }
    if (result.status === 429) {
      return NextResponse.json(
        { message: 'Muitas tentativas. Aguarde 1 minuto.' },
        { status: 429 },
      );
    }
    // Não vazar conteúdo bruto do back — manter mensagem genérica.
    return NextResponse.json(
      { message: 'Não foi possível entrar agora. Tente novamente.' },
      { status: 502 },
    );
  }

  // Devolve só o username pro front mostrar saudação imediata.
  // accessToken / refreshToken NUNCA são devolvidos.
  return NextResponse.json({ username: result.data.username }, { status: 200 });
}
