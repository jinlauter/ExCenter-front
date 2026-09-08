import { LANDING_FAQ } from './landing-faq';
import { SITE_URL } from '@/lib/site';

// =============================================================================
// JSON-LD da landing — dado estruturado para o Google
// =============================================================================
//
// Renderiza UM <script type="application/ld+json">, que o browser não desenha: zero pixel na
// tela, zero mudança para quem usa o site. O que ele faz é dizer ao buscador, em vocabulário
// que ele entende (schema.org), o que esta página é.
//
// Três blocos, escolhidos porque o conteúdo para preenchê-los JÁ EXISTE na página — nenhum
// deles inventa informação:
//   - Organization: quem publica (empresa de Curitiba, fundada em 2026, contato real).
//   - SoftwareApplication + offers: o produto e os planos que já estão na tabela de preços.
//   - FAQPage: as perguntas frequentes, lidas do MESMO módulo que a seção visível usa.
//
// A regra que isso respeita: dado estruturado tem que corresponder ao que o usuário vê. FAQ
// declarado e não exibido, ou preço diferente do da tabela, é motivo de penalidade manual —
// por isso o FAQ vem de landing-faq.ts e não de uma cópia.
//
// Nada aqui promete atendimento médico, diagnóstico ou monitoramento clínico.
// =============================================================================

const CONTACT_EMAIL = 'jin_lauter@hotmail.com';

// Só os planos individuais com preço público e fechado. Clínica e Casa de Apoio ficam fora:
// são pacotes de contas com composição própria, e declará-los como uma oferta simples de
// preço único descreveria errado o que se compra.
const PLANOS_PUBLICOS = [
  { nome: 'Grátis', preco: '0' },
  { nome: 'Pessoal', preco: '19' },
  { nome: 'Ilimitado', preco: '39' },
];

export function LandingStructuredData() {
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'ExCenter',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    foundingDate: '2026',
    email: CONTACT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Curitiba',
      addressRegion: 'PR',
      addressCountry: 'BR',
    },
  };

  const application = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'ExCenter',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#organization` },
    description:
      'Reúne os laudos de exames de sangue de laboratórios diferentes num histórico único e '
      + 'mostra a evolução de cada marcador em gráficos.',
    offers: PLANOS_PUBLICOS.map((plano) => ({
      '@type': 'Offer',
      name: plano.nome,
      price: plano.preco,
      priceCurrency: 'BRL',
      category: 'subscription',
    })),
  };

  const faq = {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: LANDING_FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Um grafo só, com os três nós ligados por @id — é o formato que o Google prefere a
      // três <script> soltos, porque deixa explícito que a Organization que publica é a mesma
      // que edita o software.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [organization, application, faq],
        }),
      }}
    />
  );
}
