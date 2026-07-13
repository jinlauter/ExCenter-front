import { Activity } from 'lucide-react';
import { RegisterForm } from '@/components/register-form';

// Página de cadastro (server component): só renderiza marca + formulário.
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border border-input bg-card p-6 shadow-sm">
        <header className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <Activity className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="mt-1 text-xl font-medium text-primary-dark">ExCenter</h1>
          <p className="text-center text-sm text-primary-soft">Crie sua conta</p>
        </header>
        <RegisterForm />
      </div>
    </main>
  );
}
