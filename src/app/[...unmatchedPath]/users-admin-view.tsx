'use client';

import { useState, useTransition } from 'react';
import { Copy, Loader2, MailPlus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PLAN_OPTIONS, planLabel } from '@/lib/plans';
import type { CreatedInviteResult, ReviewActionResult, UserAccountSummary } from './types';

interface UsersAdminViewProps {
  accounts: UserAccountSummary[];
  createInvite: (email: string, plan: string) => Promise<CreatedInviteResult>;
  deleteAccount: (userId: string) => Promise<ReviewActionResult>;
  updatePlan: (userId: string, plan: string) => Promise<ReviewActionResult>;
}

// A gestão de contas do operador. A regra de ouro da tela: o código do convite aparece AQUI,
// UMA vez, e nunca mais — o banco guarda só o hash. O box do código insiste nisso porque a
// próxima vez que o operador quiser vê-lo, a resposta será "crie outro convite".
export function UsersAdminView({ accounts, createInvite, deleteAccount, updatePlan }: UsersAdminViewProps) {
  const [email, setEmail] = useState('');
  // Plano padrão do convite = Grátis, alinhado ao default do back (rede de segurança se a UI falhar).
  const [plan, setPlan] = useState<string>('Free');
  const [lastInvite, setLastInvite] = useState<CreatedInviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  // Edição de plano por linha: guarda o id em atualização (desabilita só aquele <select>) e a
  // mensagem de erro. Transition própria pra não colidir com convite/exclusão.
  const [planUpdatingId, setPlanUpdatingId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [, startPlanTransition] = useTransition();
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
      const result = await createInvite(email.trim(), plan);
      if (result.ok) {
        setLastInvite(result);
        setEmail('');
      } else {
        setError(result.message ?? 'Não foi possível criar o convite.');
      }
    });
  }

  function changePlan(account: UserAccountSummary, nextPlan: string) {
    if (nextPlan === account.plan || planUpdatingId) return;
    setPlanError(null);
    setPlanUpdatingId(account.id);
    startPlanTransition(async () => {
      const result = await updatePlan(account.id, nextPlan);
      setPlanUpdatingId(null);
      // Sucesso: a action revalida a página e a linha volta com o plano novo. Falha: mensagem
      // e o <select> reverte sozinho ao valor do servidor (é controlado por account.plan).
      if (!result.ok) setPlanError(result.message ?? 'Não foi possível alterar o plano.');
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
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            disabled={isPending}
            aria-label="Plano do convite"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {planLabel(option)}
              </option>
            ))}
          </select>
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
        {planError && <p className="px-4 pt-3 text-sm text-destructive">{planError}</p>}
        <div className="overflow-x-auto horizontal-scroll-visible">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Usuário</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Plano</th>
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
                    <select
                      value={account.plan}
                      onChange={(event) => changePlan(account, event.target.value)}
                      disabled={planUpdatingId !== null}
                      aria-label={`Plano de ${account.email ?? account.username}`}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {PLAN_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {planLabel(option)}
                        </option>
                      ))}
                    </select>
                    {planUpdatingId === account.id && (
                      <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </td>
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
