import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyInviteRemote } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';

// =============================================================================
// POST /api/register/verify (Next BFF)
// =============================================================================
// O portão do primeiro acesso: valida e-mail + código ANTES de a pessoa
// preencher qualquer dado pessoal. Resposta sempre {valid: boolean} — qual dos
// dois falhou é indistinguível de propósito (o back garante isso, inclusive
// por timing).
// =============================================================================

const bodySchema = z.object({
  email: z.string().email(),
  // Mesma normalização de caixa do cadastro: o alfabeto do código é maiúsculo.
  inviteCode: z.string().trim().min(1).max(12).transform((code) => code.toUpperCase()),
});

export async function POST(request: Request) {
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const result = await verifyInviteRemote(parsed.email, parsed.inviteCode);

  if (!result.ok) {
    // 429 do rate limit atravessa — o front mostra a mensagem de espera.
    if (result.status === 429) return NextResponse.json({ valid: false }, { status: 429 });
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  return NextResponse.json({ valid: result.valid }, { status: 200 });
}
