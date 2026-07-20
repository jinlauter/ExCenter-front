'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ui/tooltip';
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
  // Ligado quando o browser autopreenche (detectado pela animação CSS, ver globals.css). O Chrome
  // esconde do JS o VALOR de campos autopreenchidos até o primeiro gesto do usuário, então na hora
  // do autofill não dá pra ler username/password pra habilitar o botão — mas dá pra SABER que houve
  // autofill (a animação dispara mesmo assim). Usamos isso pra liberar o botão; o valor real só é
  // lido no submit (o próprio clique já é o gesto que o Chrome exige pra expor o valor).
  const [autofillDetected, setAutofillDetected] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Erro vindo do callback OAuth (?error=google|microsoft) tem prioridade na 1ª render.
  const [error, setError] = useState<string | null>(initialErrorFromQuery(search.get('error')));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    // Lê direto do DOM (ref), não do state: com autofill, o Chrome só expõe o valor após o gesto
    // do usuário — e este submit já é esse gesto. O state React pode estar vazio porque o autofill
    // não dispara onChange. Fallback pro state cobre browsers/casos onde a ref não estiver pronta.
    const user = usernameRef.current?.value || username;
    const pass = passwordRef.current?.value || password;

    if (!user || !pass) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass, remember }),
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

  // Dispara quando o browser autopreenche um campo (animação CSS em :autofill, ver globals.css).
  // Marca autofillDetected pra liberar o botão sem depender de ler o valor (que o Chrome esconde
  // até o gesto). Também tenta sincronizar o state a partir da ref — funciona em browsers que já
  // expõem o valor no autofill; onde não expõem, fica vazio aqui e o valor real só é lido no submit.
  // Escuta tanto onAnimationStart quanto onAnimationIteration: com autofill sem NENHUMA interação
  // do usuário, esse "start" pode disparar antes do React terminar de montar o listener (hidratação/
  // chunk JS ainda carregando) e se perder pra sempre — a animação em loop (ver globals.css) garante
  // que a iteração seguinte, meio segundo depois, ainda seja capturada.
  function syncAutofilledFields(e: React.AnimationEvent<HTMLInputElement>) {
    if (e.animationName !== 'autofill-detect') return;
    setAutofillDetected(true);
    if (usernameRef.current?.value) setUsername(usernameRef.current.value);
    if (passwordRef.current?.value) setPassword(passwordRef.current.value);
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
          ref={usernameRef}
          id="username"
          type="text"
          placeholder="seu@email.com"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onAnimationStart={syncAutofilledFields}
          onAnimationIteration={syncAutofilledFields}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          ref={passwordRef}
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onAnimationStart={syncAutofilledFields}
          onAnimationIteration={syncAutofilledFields}
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

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || (!(username && password) && !autofillDetected)}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
      </Button>

      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          ou continue com
        </span>
      </div>

      <div className="flex gap-2">
        <Tooltip className="flex-1" content={googleEnabled ? undefined : comingSoonMessage('Google')}>
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
        </Tooltip>
        <Tooltip
          className="flex-1"
          content={microsoftEnabled ? undefined : comingSoonMessage('Microsoft')}
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
        </Tooltip>
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
