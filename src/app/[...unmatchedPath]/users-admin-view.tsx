'use client';

import { useState, useTransition } from 'react';
import { Copy, Loader2, MailPlus } from 'lucide-react';
import type { CreatedInviteResult, UserAccountSummary } from './types';

interface UsersAdminViewProps {
  accounts: UserAccountSummary[];
  createInvite: (email: string) => Promise<CreatedInviteResult>;
}

// A gestão de contas do operador. A regra de ouro da tela: o código do convite aparece AQUI,
// UMA vez, e nunca mais — o banco guarda só o hash. O box do código insiste nisso porque a
// próxima vez que o operador quiser vê-lo, a resposta será "crie outro convite".
export function UsersAdminView({ accounts, createInvite }: UsersAdminViewProps) {
  const [email, setEmail] = useState('');
  const [lastInvite, setLastInvite] = useState<CreatedInviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !email.trim()) return;
    setError(null);
    setCopied(false);

    startTransition(async () => {
      const result = await createInvite(email.trim());
      if (result.ok) {
        setLastInvite(result);
        setEmail('');
      } else {
        setError(result.message ?? 'Não foi possível criar o convite.');
      }
    });
  }

  async function copyInvite() {
    if (!lastInvite?.inviteCode) return;
    await navigator.clipboard.writeText(
      `ExCenter — primeiro acesso\nE-mail: ${lastInvite.email}\nCódigo do convite: ${lastInvite.inviteCode}`,
    );
    setCopied(true);
  }

  return (
    <section className="space-y-4">
      <form onSubmit={submitInvite} className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Convidar por e-mail</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          A conta nasce pendente; a pessoa completa o cadastro no “Primeiro acesso” com o e-mail e o código.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="email@dapessoa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
            className="w-64 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={isPending || !email.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="inline h-4 w-4 animate-spin" /> : <><MailPlus className="mr-1 inline h-4 w-4" />Criar convite</>}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        {lastInvite?.inviteCode && (
          <div className="mt-3 rounded-md border border-primary bg-primary-light/40 p-3">
            <p className="text-sm font-medium">Convite criado para {lastInvite.email}</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em]">{lastInvite.inviteCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Copie e repasse AGORA — o código não aparece de novo. Perdeu? Crie outro convite.
            </p>
            <button
              type="button"
              onClick={copyInvite}
              className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Copy className="mr-1 inline h-3.5 w-3.5" />
              {copied ? 'Copiado!' : 'Copiar e-mail + código'}
            </button>
          </div>
        )}
      </form>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto horizontal-scroll-visible">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Usuário</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{account.username}</td>
                  <td className="px-4 py-2 text-muted-foreground">{account.email ?? '—'}</td>
                  <td className="px-4 py-2">
                    {account.registrationPending ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        convite pendente
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        conta ativa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(account.invitedAt ?? account.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
