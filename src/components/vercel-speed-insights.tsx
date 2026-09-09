'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { limparUrl } from '@/components/vercel-analytics';

// =============================================================================
// Vercel Speed Insights — com o MESMO filtro de URL do Web Analytics
// =============================================================================
//
// O Speed Insights reporta a URL da página junto da métrica de desempenho, exatamente como o
// Web Analytics faz. Então ele herda o mesmo risco, e a documentação da Vercel (que manda pôr
// `<SpeedInsights />` cru no layout) não sabe disso: **a URL do exame compartilhado carrega o
// token**, e o token É a autorização de acesso ao exame.
//
// Instalado sem filtro, o painel da Vercel passaria a guardar endereços que qualquer pessoa com
// acesso ao painel poderia colar no browser e abrir o exame de sangue de alguém. O wrapper do
// Analytics existe por esse motivo; repetir o erro aqui anularia aquela proteção, porque basta
// UM dos dois vazar para o endereço estar lá.
//
// Por isso reaproveita `limparUrl` em vez de reimplementar: uma regra só, um teste só
// (`vercel-analytics.test.ts`), e uma correção futura vale para os dois de uma vez.
// =============================================================================

export function VercelSpeedInsights() {
  return <SpeedInsights beforeSend={(event) => ({ ...event, url: limparUrl(event.url) })} />;
}
