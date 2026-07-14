import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/lib/utils';

describe('safeRedirectPath', () => {
  it('retorna o fallback quando dest é null/undefined/vazio', () => {
    expect(safeRedirectPath(null)).toBe('/home');
    expect(safeRedirectPath(undefined)).toBe('/home');
    expect(safeRedirectPath('')).toBe('/home');
  });

  it('aceita um fallback customizado', () => {
    expect(safeRedirectPath(null, '/login')).toBe('/login');
  });

  it('rejeita URLs absolutas (não começam com /)', () => {
    expect(safeRedirectPath('https://site-malicioso.com')).toBe('/home');
    expect(safeRedirectPath('site-malicioso.com')).toBe('/home');
  });

  it('rejeita protocol-relative "//evil.com"', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/home');
  });

  it('rejeita protocol-relative com barra invertida "/\\\\evil.com"', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/home');
  });

  it('aceita caminhos internos válidos', () => {
    expect(safeRedirectPath('/configuracoes')).toBe('/configuracoes');
    expect(safeRedirectPath('/historico?tab=recentes')).toBe('/historico?tab=recentes');
  });
});
