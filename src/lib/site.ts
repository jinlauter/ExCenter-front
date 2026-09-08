/**
 * Endereço canônico do site. Usado por sitemap, robots e metadados absolutos.
 *
 * Fixo com fallback e não só env var: sitemap e robots são servidos em build/edge e um valor
 * ausente viraria `undefined` dentro de uma URL — o Google recusaria o arquivo inteiro sem
 * dizer por quê. `NEXT_PUBLIC_SITE_URL` existe para preview/staging apontarem pra si mesmos.
 *
 * COM www: é o host que já está no ar e o que foi verificado no Search Console. Trocar isto
 * depois de indexar joga fora a autoridade construída — mudar só junto com um redirect 301.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.excenter.tec.br').replace(/\/$/, '');

/** Prefixos que NUNCA podem ser indexados nem entrar no sitemap. */
export const NON_INDEXABLE_PREFIXES = [
  '/api',
  // Área autenticada: o crawler nem chega (o proxy redireciona pro login), mas listar é o que
  // impede alguém de "otimizar" o sitemap incluindo tudo.
  '/home',
  '/exames-enviados',
  '/resultados',
  '/configuracoes',
  // Exame publicado em link público. Este é o único que o crawler CONSEGUE abrir sem sessão —
  // é dado de saúde, e indexá-lo é incidente, não erro de SEO. Ver o item de compartilhamento
  // em docs/BACKLOG.md.
  '/resultados-compartilhados',
];
