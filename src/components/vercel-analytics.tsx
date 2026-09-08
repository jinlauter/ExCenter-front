'use client';

import { Analytics } from '@vercel/analytics/next';

// =============================================================================
// Vercel Web Analytics, com as URLs limpas antes de saírem daqui
// =============================================================================
//
// Existe como wrapper 'use client' por uma razão técnica e uma de conteúdo.
//
// A técnica: `beforeSend` é uma função, e função não atravessa a fronteira de um server
// component. Sem este arquivo, o `<Analytics />` teria que ir cru no layout — sem filtro.
//
// A de conteúdo, que é a que importa: o Analytics reporta a URL da página, e **a URL do exame
// compartilhado carrega o token**. Colocado sem filtro, o painel da Vercel passaria a guardar a
// credencial completa de acesso a um exame de sangue — um endereço que qualquer pessoa com
// acesso ao painel poderia colar no browser e abrir o exame de alguém. Não é hipótese: é o
// desenho do recurso, onde a posse do endereço É a autorização.
//
// Por isso as URLs são reescritas antes do envio:
//   - o token do link compartilhado vira `[token]`;
//   - qualquer UUID em caminho (ex.: /resultados/<testId>) vira `[id]`.
//
// O que se perde: nada que alguém fosse usar. Ninguém analisa tráfego por UUID de exame; a
// métrica útil é "quantas vezes a tela de detalhe foi aberta", e essa continua inteira.
// =============================================================================

const SEGMENTO_UUID =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi;

const LINK_COMPARTILHADO = /\/resultados-compartilhados\/[^/?#]+/i;

export function limparUrl(url: string): string {
  return url
    .replace(LINK_COMPARTILHADO, '/resultados-compartilhados/[token]')
    .replace(SEGMENTO_UUID, '/[id]');
}

export function VercelAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: limparUrl(event.url) })} />;
}
