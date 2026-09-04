import { describe, expect, it } from 'vitest';
import { isOutOfRange, parseReferenceRange, resolveReferenceRange } from '@/lib/reference-range';

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

// ── Separador de milhar (o bug do falso "fora da faixa") ────────────────────
//
// Espelha ReferenceRangeEvaluatorTests/LabNumberTests do back: se as duas pontas divergirem,
// o badge da tela discorda do IsAbnormal gravado no banco.
describe('parseReferenceRange — separador de milhar', () => {
  it.each([
    ['150.000 a 450.000 /µL', 150000, 450000], // plaquetas
    ['4.000 a 10.000 /µL', 4000, 10000],       // leucócitos
    ['200 a 1.000 /µL', 200, 1000],            // monócitos: um lado com separador
  ])('%s → %d a %d', (raw, min, max) => {
    expect(parseReferenceRange(raw)).toEqual({ min, max });
  });

  // O caso exato visto em produção: valor SEM separador contra faixa COM.
  it('monócitos 370/µL contra "200 a 1.000" NÃO é fora da faixa', () => {
    expect(isOutOfRange(370, '200 a 1.000 /µL')).toBe(false);
    expect(isOutOfRange(150, '200 a 1.000 /µL')).toBe(true);
    expect(isOutOfRange(1200, '200 a 1.000 /µL')).toBe(true);
  });

  it('plaquetas na escala do laudo ficam dentro da faixa', () => {
    expect(isOutOfRange(267000, '150.000 a 450.000 /µL')).toBe(false);
    expect(isOutOfRange(100000, '150.000 a 450.000 /µL')).toBe(true);
  });

  // Zero à esquerda nunca é milhar — e força a leitura decimal no outro limite também,
  // senão "0.500 a 1.500" viraria "0,5 a 1500", faixa que esconde alteração real.
  it('não confunde decimal com milhar', () => {
    expect(parseReferenceRange('13,0 a 17,0 g/dL')).toEqual({ min: 13, max: 17 });
    expect(parseReferenceRange('0.500 a 1.500 ng/mL')).toEqual({ min: 0.5, max: 1.5 });
  });
});

// Casos reais do banco (07/08/2026): a IA escolhe a linha da tabela estratificada aplicável ao
// paciente e a transcreve verbatim — o rótulo etário vem junto, e ele é ele mesmo um intervalo
// numérico. Sem o descarte, o texto contava duas cláusulas e o badge "Fora da faixa" sumia de
// resultados cuja normalidade é demonstrável. Espelho dos testes do ReferenceRangeEvaluator.
describe('parseReferenceRange — rótulo de faixa etária em linha única', () => {
  it('descarta o rótulo e lê a faixa', () => {
    expect(parseReferenceRange('17 a 40 anos: 82 a 626 ng/dL')).toEqual({ min: 82, max: 626 });
    expect(parseReferenceRange('De 22 a 49 anos: 164,94 a 753,38 ng/dL')).toEqual({ min: 164.94, max: 753.38 });
    expect(parseReferenceRange('Acima de 50 anos: 3,4 a 24,6 pg/mL')).toEqual({ min: 3.4, max: 24.6 });
  });

  it('rótulo de sexo continua funcionando como antes', () => {
    expect(parseReferenceRange('Masculino: De 143 a 842 pg/mL')).toEqual({ min: 143, max: 842 });
  });

  it('tabela multilinha de estratos continua null — escolher estrato seria chute', () => {
    expect(parseReferenceRange('17 a 40 anos: 82 a 626 ng/dL\n41 a 60 anos: 60 a 500 ng/dL')).toBeNull();
  });

  it('o ganho fim-a-fim: valor real que ficava sem badge passa a ter veredicto', () => {
    expect(isOutOfRange(347.56, '17 a 40 anos: 82 a 626 ng/dL')).toBe(false);
    expect(isOutOfRange(58, '17 a 40 anos: 82 a 626 ng/dL')).toBe(true);
  });
});

// Casos reais da segunda auditoria (07/08/2026), espelhos dos testes do ReferenceRangeEvaluator.
describe('parseReferenceRange — rótulo com sexo/comparador e conector "entre"', () => {
  // O rótulo é descartado (sem isso "> 21" viraria cláusula). O conector de FAIXA "X até Y" já
  // é lido (ver o describe próprio abaixo), mas o "até N" SOZINHO — só teto, sem número antes —
  // continua fora: lê-lo exige a máscara de trechos já reconhecidos que o back tem e o front
  // não, senão "de 65 até 175" contaria como faixa E como teto e cairia na regra das múltiplas
  // cláusulas. O veredicto deste caso vem do IsAbnormal GRAVADO pelo back, que o front exibe;
  // este teste fixa a lacuna conhecida para ela não passar despercebida.
  it('rótulo com sexo e comparador é descartado, mas "até N" sozinho ainda não é lido', () => {
    expect(parseReferenceRange('Masculino > 21 anos: até 39,8 pg/mL')).toBeNull();
  });

  it('lê a faixa "Entre X e Y"', () => {
    expect(parseReferenceRange('Entre 15 e 40. U/L')).toEqual({ min: 15, max: 40 });
    expect(parseReferenceRange('entre 4,0 e 10,0 mg/dL')).toEqual({ min: 4, max: 10 });
  });

  it('"e" solto sem "entre" não vira faixa', () => {
    expect(parseReferenceRange('dosagens 15 e 40 conforme protocolo')).toBeNull();
  });
});

// ── Conector "até" (o ponto verde que era vermelho) ─────────────────────────
//
// Labs brasileiros escrevem a faixa como "X a Y" e como "de X até Y", inclusive no MESMO analito
// ao longo do tempo. Sem "até", parseReferenceRange devolvia null, isOutOfRange devolvia false em
// silêncio e valor alterado aparecia como normal. Medido numa série real de Monócitos em
// 13/08/2026: 9 dos 17 pontos usavam "até". O back (ReferenceRangeEvaluator.BetweenWords) já lia
// as duas formas — era o front que divergia.
describe('parseReferenceRange — conector "até"', () => {
  it.each([
    ['de 2,0 até 10,0 %', 2, 10],           // monócitos: o caso que motivou
    ['de 1.600 até 7.700 /μL', 1600, 7700], // neutrófilos: "até" + separador de milhar
    ['de 13,5 até 17,5 g/dL', 13.5, 17.5],  // hemoglobina
    ['65 até 175', 65, 175],                // sem o "de" na frente
  ])('%s → %d a %d', (raw, min, max) => {
    expect(parseReferenceRange(raw)).toEqual({ min, max });
  });

  it('o ganho fim-a-fim: o ponto que ficava verde fica vermelho', () => {
    expect(isOutOfRange(11, 'de 2,0 até 10,0 %')).toBe(true);
    expect(isOutOfRange(8.3, 'de 2,0 até 10,0 %')).toBe(false);
  });

  it('as duas grafias da MESMA faixa dão o mesmo veredicto', () => {
    expect(parseReferenceRange('de 2,0 até 10,0 %')).toEqual(parseReferenceRange('2,0 a 10,0'));
  });
});

// ── resolveReferenceRange — faixa estruturada da extração vs parse textual ──
// O caso que motivou os campos: HbA1c multi-faixa ("Normal / Risco / Diabetes"), que o parse
// textual corretamente recusa (múltiplas cláusulas), mas a IA da extração já resolveu.
describe('resolveReferenceRange', () => {
  const hba1cMultiFaixa =
    'Normal: Inferior a 5,7% Risco aumentado para Diabetes Mellitus: 5,7 a 6,4% Diabetes Mellitus: Igual ou superior a 6,5%';

  it('prefere a faixa estruturada e ignora o texto', () => {
    expect(resolveReferenceRange(null, 5.7, hba1cMultiFaixa)).toEqual({ min: null, max: 5.7 });
    expect(resolveReferenceRange(70, 99, '70 a 99')).toEqual({ min: 70, max: 99 });
  });

  it('um lado só também conta como estruturada (não mistura com o texto)', () => {
    expect(resolveReferenceRange(90, null, 'Superior a 90')).toEqual({ min: 90, max: null });
  });

  it('sem nenhum limite estruturado, cai no parse textual (linha antiga)', () => {
    expect(resolveReferenceRange(null, null, '13,0 a 17,0 g/dL')).toEqual({ min: 13, max: 17 });
    expect(resolveReferenceRange(undefined, undefined, hba1cMultiFaixa)).toBeNull();
  });

  it('sem estruturada e sem texto parseável, devolve null', () => {
    expect(resolveReferenceRange(null, null, 'Não reagente')).toBeNull();
    expect(resolveReferenceRange(null, null, null)).toBeNull();
  });
});

// O rótulo etário usa o MESMO conector da faixa — se só um dos dois conhecer "até", o rótulo
// deixa de ser descartado e vira uma segunda cláusula, zerando o veredicto de um texto válido.
describe('parseReferenceRange — rótulo etário escrito com "até"', () => {
  it('descarta o rótulo e lê a faixa nas duas grafias', () => {
    expect(parseReferenceRange('De 22 até 49 anos: 164,94 a 753,38 ng/dL')).toEqual({
      min: 164.94,
      max: 753.38,
    });
    expect(parseReferenceRange('17 até 40 anos: de 82 até 626 ng/dL')).toEqual({
      min: 82,
      max: 626,
    });
  });
});
