import { Suspense } from 'react';
import { BrandLogo } from '@/components/brand-logo';
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
        <header className="mb-6 flex flex-col items-center">
          {/* h1 aqui e não dentro do BrandLogo: a marca aparece em barra de navegação na maior
              parte dos lugares, onde ela NÃO é o título da página — só nesta é. */}
          <h1>
            <BrandLogo size="lg" stacked className="text-primary-dark" />
          </h1>
          <p className="mt-3 text-center text-sm text-primary-soft">Seus exames, um histórico.</p>
        </header>
        <Suspense>
          <LoginForm googleEnabled={isGoogleEnabled} microsoftEnabled={isMicrosoftEnabled} />
        </Suspense>
      </div>
    </main>
  );
}
