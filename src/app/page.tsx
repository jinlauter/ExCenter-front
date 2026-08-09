import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Landing } from '@/components/landing/landing';

// Rota raiz: porta de entrada pública. Quem já tem sessão vai pro app; quem não tem vê a landing
// de vendas (CTA em checkout simulado por ora — ver BACKLOG do back para o fluxo real).
export default async function RootPage() {
  const session = await getSession();
  if (session.accessToken) redirect('/home');
  return <Landing />;
}
