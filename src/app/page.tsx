import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Landing } from '@/components/landing/landing';
import { LandingStructuredData } from '@/components/landing/landing-structured-data';

// Rota raiz: porta de entrada pública. Quem já tem sessão vai pro app; quem não tem vê a landing
// de vendas (CTA em checkout simulado por ora — ver BACKLOG do back para o fluxo real).
export default async function RootPage() {
  const session = await getSession();
  if (session.accessToken) redirect('/home');

  return (
    <>
      {/* Um <script type="application/ld+json"> — não desenha nada, não altera o layout.
          Fica AQUI (server component) e não dentro da Landing, que é 'use client': dado
          estruturado precisa estar no HTML que o crawler recebe, não depender de hidratação. */}
      <LandingStructuredData />
      <Landing />
    </>
  );
}
