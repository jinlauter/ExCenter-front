'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { storePasswordCredential } from '@/lib/credentials';

// =============================================================================
// RegisterForm (client) — primeiro acesso por convite, em DUAS etapas
// =============================================================================
// Etapa 1 (portão): e-mail + código, validados no back ANTES de a pessoa
// preencher qualquer dado — errar o código não custa um formulário inteiro.
// Etapa 2 (efetivação): os dados pessoais, com o e-mail TRAVADO — ele foi
// verificado junto com o código e não pode divergir do convite; editável aqui,
// um erro de digitação faria o cadastro falhar no fim com mensagem genérica.
// =============================================================================

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<'portao' | 'efetivacao'>('portao');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/register/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, inviteCode }),
        });

        if (res.status === 429) {
          setError('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
          return;
        }
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.valid) {
          setError('Convite inválido. Confira o e-mail e o código com quem te convidou.');
          return;
        }

        setStep('efetivacao');
      } catch {
        setError('Falha de rede. Verifique sua conexão e tente novamente.');
      }
    });
  }

  // Validação ANTES do envio, com mensagem específica por campo — o back revalida tudo, mas
  // erro de digitação merece resposta imediata e clara, não uma viagem ao servidor.
  function validateCompletion(): string | null {
    const lettersInName = fullName.trim().replace(/[^\p{L}]/gu, '');
    if (lettersInName.length < 3) return 'Nome completo precisa de pelo menos 3 letras.';
    if (fullName.trim().length > 100) return 'Nome completo pode ter no máximo 100 caracteres.';

    const birthDate = new Date(`${dateOfBirth}T00:00:00`);
    if (!dateOfBirth || Number.isNaN(birthDate.getTime())) return 'Data de nascimento inválida.';
    if (birthDate > new Date()) return 'Data de nascimento não pode ser no futuro.';
    if (birthDate.getFullYear() < 1900) return 'Data de nascimento inválida.';

    if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (password !== confirmPassword) return 'As senhas não coincidem.';

    return null;
  }

  function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    const validationError = validateCompletion();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName, dateOfBirth, inviteCode }),
        });

        if (res.status === 429) {
          setError('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.message ?? 'Não foi possível concluir o cadastro. Tente novamente em instantes.');
          return;
        }

        // Oferece salvar user/senha no gerenciador do browser antes de navegar (a navegação SPA
        // sozinha não dispara o prompt do Chrome). Ver storePasswordCredential.
        await storePasswordCredential(email, password, fullName);

        router.replace('/home');
        router.refresh();
      } catch {
        setError('Falha de rede. Verifique sua conexão e tente novamente.');
      }
    });
  }

  if (step === 'portao') {
    return (
      <form className="space-y-4" onSubmit={handleVerify}>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inviteCode">Código do convite</Label>
          <Input
            id="inviteCode"
            placeholder="Ex: A7KX2M"
            autoComplete="off"
            autoCapitalize="characters"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            disabled={isPending}
            className="uppercase tracking-widest"
          />
          <p className="text-xs text-muted-foreground">
            Você recebeu este código junto com o convite. Sem convite não é possível criar conta.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !email.trim() || !inviteCode.trim()}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuar'}
        </Button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleComplete}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        {/* Travado de propósito: verificado junto com o código na etapa anterior — divergir
            aqui faria o cadastro falhar no fim. "Usar outro e-mail" volta ao portão. */}
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          readOnly
          className="bg-muted text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => { setStep('portao'); setError(null); }}
          className="text-xs text-primary hover:underline"
          disabled={isPending}
        >
          Usar outro e-mail
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input
          id="fullName"
          placeholder="Seu nome completo"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dateOfBirth">Data de nascimento</Label>
        <Input
          id="dateOfBirth"
          type="date"
          autoComplete="bday"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !fullName.trim() || !dateOfBirth || !password || !confirmPassword}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Concluir primeiro acesso'}
      </Button>
    </form>
  );
}
