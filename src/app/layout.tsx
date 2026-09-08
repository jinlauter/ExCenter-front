import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { VercelAnalytics } from '@/components/vercel-analytics';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
});

// NENHUMA destas tags aparece na tela — metadata só existe no <head>, para buscador e para o
// card de link em WhatsApp/LinkedIn. A landing continua pixel por pixel o que era.
export const metadata: Metadata = {
  // Sem isto, toda URL de metadado (canonical, og:image) sai RELATIVA — e o Google, o WhatsApp
  // e o LinkedIn descartam o que não é absoluto. É também o que faz o `canonical` abaixo
  // resolver pro host oficial.
  metadataBase: new URL(SITE_URL),

  // Template: cada página filha declara só o próprio nome e ganha o sufixo da marca. `default`
  // é o que a raiz usa. O título é o texto de maior peso na busca, e "ExCenter" sozinho não
  // dizia o que o produto faz — ninguém busca pela marca de um produto que ainda não conhece.
  title: {
    default: 'ExCenter — todos os seus exames de sangue num histórico só',
    template: '%s | ExCenter',
  },

  // A descrição antiga ("Seu histórico. Seu controle.") tem 4 palavras e nenhum termo que
  // alguém digitaria. Esta responde à busca real de quem tem o problema: juntar laudos de
  // laboratórios diferentes e ver a evolução de um marcador ao longo do tempo.
  description:
    'Junte os laudos de todos os laboratórios num histórico só e acompanhe a evolução dos '
    + 'seus exames de sangue em gráficos. Envie o PDF e veja a tendência de cada marcador.',

  keywords: [
    'histórico de exames de sangue',
    'juntar exames de laboratórios diferentes',
    'gráfico de exames de sangue',
    'acompanhar resultados de exames',
    'guardar laudos de exames',
  ],

  // Canonical na raiz: o mesmo conteúdo responde em apex e www, e sem declarar qual é o
  // oficial o Google divide o sinal entre os dois. Páginas filhas sobrescrevem com a sua.
  alternates: { canonical: '/' },

  // O card que aparece quando o link é colado em grupo de WhatsApp, Telegram ou LinkedIn. A
  // imagem vem de app/opengraph-image.tsx; aqui só o texto. Sem isto, o link cola "pelado".
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'ExCenter',
    url: '/',
    title: 'ExCenter — todos os seus exames de sangue num histórico só',
    description:
      'Envie o PDF de qualquer laboratório e veja a evolução de cada marcador em gráficos.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExCenter — todos os seus exames de sangue num histórico só',
    description:
      'Envie o PDF de qualquer laboratório e veja a evolução de cada marcador em gráficos.',
  },

  // Explícito e permissivo AQUI, na raiz, porque o default do robots já seria indexar — o que
  // importa é que as rotas privadas sobrescrevem isto com index:false. Ver o item de
  // compartilhamento em docs/BACKLOG.md.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sem limite de trecho/preview: é assim que a página pode virar um resultado rico em
      // vez de duas linhas cortadas.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body className="font-sans">
        {children}
        {/* Não renderiza nada visível. Vai pelo wrapper e não pelo <Analytics /> cru porque a
            URL precisa ser higienizada antes do envio — a rota do exame compartilhado tem o
            token no endereço. Ver o comentário do componente. */}
        <VercelAnalytics />
      </body>
    </html>
  );
}
