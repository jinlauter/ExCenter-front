import type { MetadataRoute } from 'next';
import { NON_INDEXABLE_PREFIXES, SITE_URL } from '@/lib/site';

// =============================================================================
// /robots.txt
// =============================================================================
//
// Duas funções, e a segunda é a que importa mais aqui:
//   1. apontar o sitemap — é assim que crawlers que não passam pelo Search Console o acham;
//   2. **manter o crawler longe de /resultados-compartilhados.** Essa rota abre sem login e
//      mostra exame de sangue de uma pessoa real; um link colado num fórum ou num grupo público
//      é caminho suficiente pro Googlebot chegar até ela.
//
// robots.txt sozinho NÃO é garantia — ele é um pedido, e uma URL bloqueada aqui ainda pode ser
// indexada "às cegas" se houver link externo apontando pra ela. A garantia de verdade é o
// `noindex` na própria página e no header da resposta (ver o item de compartilhamento em
// docs/BACKLOG.md). Este arquivo é a primeira das camadas, não a única.
// =============================================================================

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: NON_INDEXABLE_PREFIXES.map((prefix) => `${prefix}/`),
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // Diz qual host é o oficial quando o mesmo conteúdo responde em mais de um (apex × www).
    // Ignorado pelo Google, respeitado pelo Yandex — e documenta a escolha para quem ler.
    host: SITE_URL,
  };
}
