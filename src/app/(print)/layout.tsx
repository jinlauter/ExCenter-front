import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import './laudo-print.css';

// Layout das rotas de IMPRESSÃO: mesma guarda de sessão do (app), mas sem sidebar nem shell —
// a página É o documento, e qualquer cromo da aplicação sairia junto no papel.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.accessToken || !session.username) {
    redirect('/login');
  }

  return <>{children}</>;
}
