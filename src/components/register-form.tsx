'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// =============================================================================
// RegisterForm (client)
// =============================================================================
// Chama POST /api/register (route handler do Next) — mesmo padrão do LoginForm,
// nenhum token aparece aqui.
// =============================================================================

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (res.status === 429) {
          setError('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.message ?? 'Não foi possível criar a conta. Tente novamente em instantes.');
          return;
        }

        router.replace('/home');
        router.refresh();
      } catch {
        setError('Falha de rede. Verifique sua conexão e tente novamente.');
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
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
        disabled={isPending || !email || !password || !confirmPassword}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar conta'}
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
