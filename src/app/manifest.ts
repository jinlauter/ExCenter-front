import type { MetadataRoute } from 'next';

// =============================================================================
// /manifest.webmanifest
// =============================================================================
//
// Convenção `manifest.ts` do App Router: serve o arquivo e injeta `<link rel="manifest">`
// sozinho. É o que o Android/Chrome lê quando alguém escolhe "Adicionar à tela de início" —
// sem ele, o atalho sai com o nome cru da aba e abre dentro do navegador com barra de endereço.
//
// Escopo do que este arquivo É: metadado de atalho. **Não** transforma o ExCenter em PWA —
// não há service worker, não há uso offline, e nada aqui promete isso. Foi escrito porque o
// checklist técnico de SEO (docs/BACKLOG.md § SEO técnico) o listava e o custo é um arquivo.
//
// `display: 'standalone'` vale a pena aqui e não é enfeite: aberto pelo atalho, o app ocupa a
// tela inteira do celular — e a tela que importa (o gráfico de evolução de um marcador) é
// justamente a que sofre com os ~100px que a barra de endereço come.
//
// O que NÃO entra, para ser decisão e não esquecimento:
//   - `purpose: 'maskable'` no ícone: máscara adaptativa do Android recorta um círculo do
//     centro, e a linha de pulso do `icon.svg` vai de borda a borda — declarar maskable sem
//     redesenhar o ícone com margem de segurança faria o Android cortar as pontas do traço.
//   - `shortcuts` e `screenshots`: são vitrine de instalação de app de verdade, e não há
//     instalação de verdade (ver o parágrafo de escopo acima).
// =============================================================================

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `name` aparece no diálogo de instalação; `short_name` é o que cabe embaixo do ícone na
    // tela de início — mais que ~12 caracteres o Android trunca com reticências.
    name: 'ExCenter — todos os seus exames de sangue num histórico só',
    short_name: 'ExCenter',
    description:
      'Junte os laudos de todos os laboratórios num histórico só e acompanhe a evolução dos '
      + 'seus exames de sangue em gráficos.',
    lang: 'pt-BR',
    start_url: '/',
    display: 'standalone',

    // Fundo da tela de abertura enquanto o app carrega (--background do globals.css) e cor da
    // barra de sistema depois (--primary). Os dois em hex: o manifest é JSON, não enxerga as
    // variáveis HSL do CSS.
    background_color: '#f7faf9',
    theme_color: '#0f705b',

    // Um ícone só, vetorial: `sizes: 'any'` diz ao Chrome que ele serve em qualquer densidade,
    // que é justamente a razão de o ícone da aba ser SVG (ver o comentário em icon.svg) —
    // evita exportar cinco PNGs para manter sincronizados. O iPhone ignora SVG e é atendido
    // pelo `apple-icon.tsx`, que o Next injeta à parte.
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
