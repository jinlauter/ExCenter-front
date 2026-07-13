import { Suspense } from 'react';
import { Activity } from 'lucide-react';
import { LoginForm } from '@/components/login-form';
import { isGoogleEnabled, isMicrosoftEnabled } from '@/lib/env';

// Página de login (server component): só renderiza marca + formulário.
// O form em si é client component (precisa de useState).
// As flags isXEnabled são avaliadas no servidor e passadas como prop — o
// client não precisa (nem deve) ler env vars.
//
// Suspense é necessário porque LoginForm usa useSearchParams(), que exige um
// boundary — sem isso o build estático falha (bail out de CSR).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border border-input bg-card p-6 shadow-sm">
        <header className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <Activity className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="mt-1 text-xl font-medium text-primary-dark">ExCenter</h1>
          <p className="text-center text-sm text-primary-soft">Seu histórico. Seu controle.</p>
        </header>
        <Suspense>
          <LoginForm googleEnabled={isGoogleEnabled} microsoftEnabled={isMicrosoftEnabled} />
        </Suspense>
      </div>
    </main>
  );
}
