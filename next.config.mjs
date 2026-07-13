/** @type {import('next').NextConfig} */

// =============================================================================
// Headers de segurança HTTP (defense-in-depth).
// =============================================================================
//
// Mesmo com BFF, vale termos cinto E suspensório. Se algum dia surgir um
// XSS no front, esses headers limitam o estrago: bloqueiam carga de scripts
// externos, frames de outras origens, etc.
//
// IMPORTANTE: CSP é restritiva por design. Se você adicionar libs que carregam
// fonts/imgs/scripts de outros domínios, esses domínios precisam ser
// adicionados às directives abaixo.
// =============================================================================

const isDev = process.env.NODE_ENV !== 'production';

// 'unsafe-inline' / 'unsafe-eval' em dev: Next precisa pra HMR.
// Em produção, removidos — só nossos próprios scripts via 'self'.
// 'unsafe-inline' em style-src é tolerado porque MUI/Tailwind injetam styles
// inline em runtime; pra remover de vez seria preciso nonce em cada <style>.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
];

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // HSTS: ativado mesmo em dev — browsers em localhost ignoram HSTS por
  // padrão, então não atrapalha. Em prod efetivamente trava HTTPS.
  ...(isDev
    ? []
    : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]),
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
