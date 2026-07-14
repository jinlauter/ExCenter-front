'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { GoogleIcon, MicrosoftIcon } from '@/components/brand-icons';
import { safeRedirectPath } from '@/lib/utils';

// =============================================================================
// LoginForm (client)
// =============================================================================
// Chama POST /api/login (route handler do Next), NÃO chama o .NET diretamente.
// Nenhum token jamais aparece neste arquivo — o cookie de sessão é setado
// pela própria route handler.
// =============================================================================

interface LoginFormProps {
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
}

export function LoginForm({ googleEnabled = false, microsoftEnabled = false }: LoginFormProps) {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  // Erro vindo do callback OAuth (?error=google|microsoft) tem prioridade na 1ª render.
  const [error, setError] = useState<string | null>(initialErrorFromQuery(search.get('error')));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (res.status === 401) {
          setError('Credenciais inválidas. Verifique e-mail e senha.');
          return;
        }
        if (res.status === 429) {
          setError('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
          return;
        }
        if (!res.ok) {
          setError('Não foi possível entrar. Tente novamente em instantes.');
          return;
        }

        router.replace(safeRedirectPath(search.get('from')));
        router.refresh(); // força server components a relerem a sessão
      } catch {
        setError('Falha de rede. Verifique sua conexão e tente novamente.');
      }
    });
  }

  function notImplemented(feature: string) {
    return () => console.info(`[TODO] ${feature} ainda não implementado`);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="username">E-mail</Label>
        <Input
          id="username"
          type="text"
          placeholder="seu@email.com"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={setRemember}
            disabled={isPending}
          />
          <Label htmlFor="remember" className="cursor-pointer text-xs">
            Lembrar de mim
          </Label>
        </div>
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            notImplemented('recuperação de senha')();
          }}
          className="text-xs text-primary hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !username || !password}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
      </Button>

      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          ou continue com
        </span>
      </div>

      <div className="flex gap-2">
        {/* title no <span> wrapper, não no <button> — navegadores geralmente não disparam
            o tooltip nativo em elementos disabled, mesmo com o atributo presente. */}
        <span
          className="flex-1"
          title={googleEnabled ? undefined : comingSoonMessage('Google')}
        >
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!googleEnabled || isPending}
            onClick={() => {
              // Full page redirect — fluxo OAuth roda server-side a partir daí.
              window.location.href = '/api/auth/google/start';
            }}
          >
            <GoogleIcon className="h-4 w-4" />
            Google
          </Button>
        </span>
        <span
          className="flex-1"
          title={microsoftEnabled ? undefined : comingSoonMessage('Microsoft')}
        >
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!microsoftEnabled || isPending}
            onClick={() => {
              window.location.href = '/api/auth/microsoft/start';
            }}
          >
            <MicrosoftIcon className="h-4 w-4" />
            Microsoft
          </Button>
        </span>
      </div>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Novo aqui?{' '}
        <Link href="/registrar" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

// Tooltip nativo (title) do botão quando o provedor não está configurado neste ambiente —
// mensagem voltada pro usuário final, não um aviso técnico de configuração.
function comingSoonMessage(provider: 'Google' | 'Microsoft'): string {
  return `Em breve! Estamos preparando o login com ${provider} pra você.`;
}

function initialErrorFromQuery(error: string | null): string | null {
  switch (error) {
    case 'google':
      return 'Não foi possível entrar com o Google. Tente novamente.';
    case 'microsoft':
      return 'Não foi possível entrar com a Microsoft. Tente novamente.';
    default:
      return null;
  }
}
