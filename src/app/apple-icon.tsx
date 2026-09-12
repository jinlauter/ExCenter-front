import { ImageResponse } from 'next/og';

// =============================================================================
// Ícone de "Adicionar à Tela de Início" no iPhone/iPad
// =============================================================================
//
// Convenção `apple-icon` do App Router: gera o PNG e injeta `<link rel="apple-touch-icon">`
// sozinho, sem tag manual. Gerado em build e cacheado — não custa nada por requisição.
//
// Por que não bastava o `icon.svg` que já existe: o iOS **ignora** favicon SVG. Sem este
// arquivo, quem salva o ExCenter na tela de início do iPhone hoje recebe uma miniatura da
// captura de tela da página como ícone — ilegível em 60px e sem nenhuma marca. Isso importa
// mais aqui do que na média dos sites: exame de sangue é coisa que se consulta do celular.
//
// 180x180 é o tamanho que o iOS pede desde o iPhone 6 Plus; ele reduz sozinho para as outras
// densidades. O sistema também aplica o próprio recorte arredondado por cima, então o desenho
// preenche o quadrado inteiro — borda arredondada desenhada aqui apareceria recortada duas vezes.
//
// Fundo verde sólido com o traço em branco (e não o par claro do `icon.svg`): na aba do
// navegador o ícone aparece sobre a barra cinza-clara do browser, mas na tela de início ele
// divide espaço com os ícones dos outros apps — quadrado quase branco ali some no papel de
// parede. É o mesmo par que o quadrado da marca no cartão de compartilhamento já usa.
// =============================================================================

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Conferido contra --primary do globals.css; ver a nota de cores em opengraph-image.tsx. */
const VERDE = '#0f705b';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: VERDE,
        }}
      >
        {/* A mesma linha de pulso de icon.svg e do BrandLogo, no mesmo viewBox de 32. */}
        <svg width="128" height="128" viewBox="0 0 32 32">
          <path
            d="M27 16h-4.5l-3.4 10.1L12.9 5.9 9.5 16H5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
