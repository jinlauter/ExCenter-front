import { BrandLogo } from '@/components/brand-logo';

// O que quem recebeu um link morto vê. Mora aqui, e não na 404 global, porque a global fala com
// quem está navegando no site ("volte para a home") — e este visitante não estava navegando:
// alguém mandou um endereço pra ele, e o que ele precisa saber é o que fazer agora.
//
// A mensagem é a mesma para as três causas (inexistente, vencido, revogado). Distinguir seria
// contar a um estranho que aquele exame existiu e foi retirado do ar.
export default function LinkIndisponivel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <div className="flex justify-center">
          <BrandLogo size="md" withTagline />
        </div>

        <h1 className="mt-6 text-xl font-medium">Este link não está mais disponível</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Links de exame são temporários: eles expiram na data escolhida por quem compartilhou, e
          podem ser encerrados antes disso a qualquer momento.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Se ainda precisa ver este exame, peça um link novo à pessoa que enviou.
        </p>
      </div>
    </main>
  );
}
