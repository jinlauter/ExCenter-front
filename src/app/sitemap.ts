import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// =============================================================================
// /sitemap.xml — a URL que se cadastra no Google Search Console
// =============================================================================
//
// Servido pela convenção do App Router (arquivo `sitemap.ts` na raiz de `app`). Estático de
// propósito: só entram páginas PÚBLICAS, estáveis e que respondem a uma busca.
//
// O que NÃO entra, escrito aqui para ser decisão e não esquecimento:
//   - área autenticada (/home, /resultados, /exames-enviados, /configuracoes): o crawler nem
//     passa do login, e listar rota protegida em sitemap só gera erro de cobertura no Console;
//   - /login e /registrar: porta de entrada de quem JÁ conhece o produto, não conteúdo de
//     busca. Indexá-las divide o sinal da home sem trazer visita;
//   - **/resultados-compartilhados**: é a única rota que abre sem sessão, e o conteúdo dela é
//     exame de sangue de gente real. Indexar isso é incidente, não erro de SEO. O `robots.ts`
//     também a bloqueia — cinto e suspensório. Ver lib/site.ts § NON_INDEXABLE_PREFIXES.
//
// Sobre `lastModified`: as datas são MANTIDAS À MÃO, de propósito. `new Date()` marcaria toda
// página como alterada a cada deploy — e o Google, ao perceber que o campo mente, passa a
// ignorar o `lastmod` do site inteiro. Data real e parada vale mais que data automática e
// falsa. **Ao mexer no conteúdo de uma destas páginas, atualize a data aqui.**
// =============================================================================

/** Última alteração real de conteúdo. Formato ISO curto; ver o comentário acima. */
const ULTIMA_ALTERACAO = {
  home: '2026-09-06',
  paraMedicos: '2026-09-06',
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(ULTIMA_ALTERACAO.home),
      // A landing muda junto com preços, seções e provas sociais — semanal descreve o ritmo
      // real. `changeFrequency` e `priority` são dicas fracas (o Google usa pouco), mas custam
      // nada e ajudam crawlers menores (Bing, DuckDuckGo).
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/para-medicos`,
      lastModified: new Date(ULTIMA_ALTERACAO.paraMedicos),
      changeFrequency: 'monthly',
      priority: 0.8,
      // A ilustração da página entra no sitemap pra ser elegível em busca de imagens. É asset
      // gerado por IA e identificado como ilustrativo — não representa equipe nem parceiros.
      images: [`${SITE_URL}/images/medical-pilot-doctors.png`],
    },
  ];
}
