import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Helper padrão do shadcn — concatena classes do Tailwind sem duplicar. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
