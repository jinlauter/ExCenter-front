import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Helper padrão do shadcn — concatena classes do Tailwind sem duplicar. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valida que um destino de redirect (ex: ?from= após login) é um caminho
 * interno, nunca uma URL absoluta ou protocol-relative pra outro domínio.
 *
 * Sem isso, um link tipo /login?from=https://site-malicioso.com engana a
 * vítima (domínio real da ExCenter na barra de endereço, login de verdade)
 * e só depois de autenticada ela é jogada pro site do atacante — open
 * redirect clássico usado em phishing.
 *
 * "//evil.com" e "/\evil.com" também são rejeitados — browsers tratam ambos
 * como protocol-relative (mesmo esquema http/https do site atual, mas host
 * diferente), não como caminho interno.
 */
export function safeRedirectPath(dest: string | null | undefined, fallback = '/home'): string {
  if (!dest) return fallback;
  if (!dest.startsWith('/')) return fallback;
  if (dest.startsWith('//') || dest.startsWith('/\\')) return fallback;
  return dest;
}
