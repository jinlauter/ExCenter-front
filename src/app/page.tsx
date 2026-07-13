import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

// Rota raiz: redireciona em função da sessão. Server-side, sem flash.
export default async function RootPage() {
  const session = await getSession();
  redirect(session.accessToken ? '/home' : '/login');
}
