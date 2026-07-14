import { describe, expect, it } from 'vitest';
import { isOutOfRange, parseReferenceRange } from '@/lib/reference-range';

describe('parseReferenceRange', () => {
  it('retorna null para texto vazio/ausente', () => {
    expect(parseReferenceRange(null)).toBeNull();
    expect(parseReferenceRange(undefined)).toBeNull();
    expect(parseReferenceRange('')).toBeNull();
  });

  it('parseia uma faixa simples "min a max"', () => {
    expect(parseReferenceRange('20,0 a 40,0')).toEqual({ min: 20, max: 40 });
  });

  it('parseia faixa com números inteiros e ponto decimal', () => {
    expect(parseReferenceRange('4 a 11')).toEqual({ min: 4, max: 11 });
    expect(parseReferenceRange('0.5 a 1.5')).toEqual({ min: 0.5, max: 1.5 });
  });

  it('parseia "Inferior a X" como max sem min', () => {
    expect(parseReferenceRange('Normal: Inferior a 5,7%')).toEqual({ min: null, max: 5.7 });
  });

  it('parseia "Superior a X" como min sem max', () => {
    expect(parseReferenceRange('Superior a 90')).toEqual({ min: 90, max: null });
  });

  it('retorna null quando há múltiplas cláusulas condicionais (ex: por idade)', () => {
    expect(
      parseReferenceRange('17 a 40 anos: 10 a 50 ng/dL. 41 a 60 anos: 20 a 60 ng/dL'),
    ).toBeNull();
  });

  it('retorna null para texto sem faixa numérica reconhecível', () => {
    expect(parseReferenceRange('Não reagente')).toBeNull();
  });

  it('lida com números negativos', () => {
    expect(parseReferenceRange('-2 a 2')).toEqual({ min: -2, max: 2 });
  });
});

describe('isOutOfRange', () => {
  it('retorna false quando o valor é null/undefined', () => {
    expect(isOutOfRange(null, '10 a 20')).toBe(false);
    expect(isOutOfRange(undefined, '10 a 20')).toBe(false);
  });

  it('retorna false quando a referência não é parseável', () => {
    expect(isOutOfRange(999, 'Não reagente')).toBe(false);
  });

  it('detecta valor abaixo do mínimo', () => {
    expect(isOutOfRange(5, '10 a 20')).toBe(true);
  });

  it('detecta valor acima do máximo', () => {
    expect(isOutOfRange(25, '10 a 20')).toBe(true);
  });

  it('não marca valor dentro da faixa', () => {
    expect(isOutOfRange(15, '10 a 20')).toBe(false);
  });

  it('valores nos limites (inclusive) não são fora da faixa', () => {
    expect(isOutOfRange(10, '10 a 20')).toBe(false);
    expect(isOutOfRange(20, '10 a 20')).toBe(false);
  });

  it('funciona com faixa só de teto ("Inferior a X")', () => {
    expect(isOutOfRange(6, 'Inferior a 5,7')).toBe(true);
    expect(isOutOfRange(5, 'Inferior a 5,7')).toBe(false);
  });

  it('funciona com faixa só de piso ("Superior a X")', () => {
    expect(isOutOfRange(80, 'Superior a 90')).toBe(true);
    expect(isOutOfRange(95, 'Superior a 90')).toBe(false);
  });
});
