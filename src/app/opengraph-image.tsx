import { ImageResponse } from 'next/og';

// =============================================================================
// O cartão que aparece quando o link do ExCenter é colado em algum lugar
// =============================================================================
//
// Convenção `opengraph-image` do App Router: vira `og:image` e `twitter:image` sozinho, sem
// tag manual. Gerado em build e cacheado — não custa nada por requisição.
//
// Por que vale a pena: hoje o link colado num grupo de WhatsApp aparece como texto pelado.
// Com isto, cada compartilhamento vira um cartão com marca, promessa e endereço — é o ativo de
// melhor retorno por hora de trabalho de toda a lista de SEO (ver docs/BACKLOG.md § SEO
// técnico), e **não muda um pixel da landing** para quem entra no site.
//
// Desenhado em fundo escuro da marca porque o cartão aparece sobre o fundo branco do WhatsApp
// e sobre o cinza do LinkedIn — claro sobre claro some.
//
// Sem fonte customizada de propósito: carregar o Poppins aqui exigiria embutir o .ttf no bundle
// da rota, e o ganho visual num cartão de 1200x630 não paga o peso.
// =============================================================================

export const alt =
  'ExCenter — todos os seus exames de sangue num histórico só, com a evolução em gráficos';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// As cores da marca em hex: o ImageResponse resolve um subconjunto de CSS e não enxerga as
// variáveis HSL do globals.css. Valores conferidos contra --primary / --primary-dark.
const VERDE = '#0f705b';
const VERDE_ESCURO = '#063229';
const VERDE_CLARO = '#7fd9be';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: VERDE_ESCURO,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Marca: o mesmo quadrado + linha de pulso do ícone da aba e do topo da landing. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 68,
              height: 68,
              borderRadius: 16,
              background: VERDE,
            }}
          >
            <svg width="42" height="42" viewBox="0 0 32 32">
              <path
                d="M27 16h-4.5l-3.4 10.1L12.9 5.9 9.5 16H5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, color: '#ffffff' }}>ExCenter</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Todos os seus exames de sangue num histórico só
          </div>
          <div style={{ fontSize: 34, color: VERDE_CLARO, lineHeight: 1.35 }}>
            Envie o PDF de qualquer laboratório e veja a evolução de cada marcador em gráficos.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.55)' }}>
          excenter.tec.br
        </div>
      </div>
    ),
    size,
  );
}
