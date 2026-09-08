import type { Metadata } from 'next';

// Layout das rotas PÚBLICAS de conteúdo do usuário — hoje, o exame compartilhado por link.
//
// Comparando com os outros grupos: o `(app)` exige sessão e monta a sidebar; o `(print)` também
// exige sessão, só que sem cromo. Este é o único que **não tem guarda nenhuma** — e é assim de
// propósito, porque quem autoriza a leitura é o token na URL, conferido pelo back.
//
// Por isso o `robots` mora AQUI e não em cada página: o dia em que este grupo ganhar uma segunda
// rota, ela nasce protegida contra indexação sem ninguém precisar lembrar. Ver também
// `app/robots.ts` (Disallow do prefixo) e o header `X-Robots-Tag` que o back manda — três
// camadas, porque exame de sangue indexado é incidente, não erro de SEO.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  // O token vai na URL. Sem isto, um clique em qualquer link externo a partir desta página
  // vazaria o token inteiro no header `Referer` — e o token é a credencial completa.
  referrer: 'no-referrer',
};

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
