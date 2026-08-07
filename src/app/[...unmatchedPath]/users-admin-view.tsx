'use client';

import { useState, useTransition } from 'react';
import { Copy, Loader2, MailPlus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { CreatedInviteResult, ReviewActionResult, UserAccountSummary } from './types';

interface UsersAdminViewProps {
  accounts: UserAccountSummary[];
  createInvite: (email: string) => Promise<CreatedInviteResult>;
  deleteAccount: (userId: string) => Promise<ReviewActionResult>;
}

// A gestão de contas do operador. A regra de ouro da tela: o código do convite aparece AQUI,
// UMA vez, e nunca mais — o banco guarda só o hash. O box do código insiste nisso porque a
// próxima vez que o operador quiser vê-lo, a resposta será "crie outro convite".
export function UsersAdminView({ accounts, createInvite, deleteAccount }: UsersAdminViewProps) {
  const [email, setEmail] = useState('');
  const [lastInvite, setLastInvite] = useState<CreatedInviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  // Transition separada da do convite: excluir uma conta não deve travar o formulário de
  // convidar (e vice-versa).
  const [accountToDelete, setAccountToDelete] = useState<UserAccountSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function confirmDelete() {
    if (!accountToDelete || isDeleting) return;
    startDeleteTransition(async () => {
      const result = await deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
      // Sucesso: a linha some sozinha — a action revalida a página. Falha: mensagem na tela.
      setDeleteError(result.ok ? null : (result.message ?? 'Não foi possível excluir a conta.'));
    });
  }

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
        {deleteError && <p className="px-4 pt-3 text-sm text-destructive">{deleteError}</p>}
        <div className="overflow-x-auto horizontal-scroll-visible">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Usuário</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2 font-medium">Desde</th>
                <th className="px-4 py-2 font-medium">Ações</th>
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
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      title="Excluir conta"
                      aria-label={`Excluir conta ${account.email ?? account.username}`}
                      onClick={() => { setDeleteError(null); setAccountToDelete(account); }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {accountToDelete && (
        <ConfirmDialog
          title="Excluir esta conta?"
          highlight={accountToDelete.email ?? accountToDelete.username}
          description="Apaga a conta e TUDO que é dela: exames, resultados e os arquivos enviados — no banco e no storage. Não tem volta."
          confirmLabel="Sim, excluir tudo"
          countdownSeconds={3}
          isLoading={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setAccountToDelete(null)}
        />
      )}
    </section>
  );
}
