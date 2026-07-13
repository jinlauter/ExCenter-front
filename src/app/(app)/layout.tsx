import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';

// Layout das rotas autenticadas — busca a sessão server-side e passa o
// username pra Sidebar. Se não houver sessão (cenário raro: middleware
// já filtra), redireciona pro login.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.accessToken || !session.username) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar username={session.username} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
