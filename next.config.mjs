/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  // 'self' só. O browser nunca abre conexão direta com o back .NET: BACKEND_URL é variável
  // server-only (sem NEXT_PUBLIC_) e todo o tráfego passa pelo BFF em /api/*, mesma origem.
  // Listar o host do Railway aqui não liberava nada que fosse usado — só criava a obrigação
  // de lembrar de atualizar o CSP a cada troca de URL do back, que é justamente o que passou
  // batido quando o ambiente foi renomeado.
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
];

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
      ]),
];

const nextConfig = {
  reactStrictMode: true,

  // pdfjs-dist (usado por react-pdf pra visualizar PDF no celular) tenta condicionalmente
  // carregar o pacote Node "canvas" pra renderização server-side, que não existe/não é
  // necessário no bundle do browser — sem isso o bundler tenta resolver e empacotar esse
  // caminho, o que causa erros de módulo no client bundle.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.ts',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Única rota que precisa ser "framável" (mesma origem): o preview inline do
        // laudo (olhinho na tela de Exames enviados) renderiza o PDF/imagem num <iframe>
        // apontando pra essa mesma rota. 'self' em vez de 'none' SÓ aqui — todo o resto
        // do app continua com frame-ancestors 'none' / X-Frame-Options DENY.
        source: '/api/bloodtests/files/:fileId/download',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.map((d) => (d.startsWith('frame-ancestors') ? "frame-ancestors 'self'" : d)).join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
