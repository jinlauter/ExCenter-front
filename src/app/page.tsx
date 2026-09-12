import { Landing } from '@/components/landing/landing';
import { LandingStructuredData } from '@/components/landing/landing-structured-data';

// Rota raiz: porta de entrada pública, e a única página do site cujo visitante é, por definição,
// primeira visita. Por isso ela é PRÉ-RENDERIZADA — nada aqui pode ler cookie, header ou sessão,
// senão o Next marca a rota como dinâmica e a Vercel passa a renderizar de novo a cada acesso.
//
// O redirect de "quem já tem sessão vai pro /home" ficava aqui e era exatamente o que tornava a
// rota dinâmica: um `getSession()` no server component. Ele mudou pro `src/proxy.ts`, junto com o
// mesmo redirect que já existia para /login e /registrar — medido em 11/09/2026, era a diferença
// entre `Cache-Control: no-store` (render de função a cada visita) e HTML servido do CDN.
export default function RootPage() {
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
