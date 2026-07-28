// Interpreta números escritos num laudo, distinguindo separador de MILHAR de DECIMAL.
//
// Irmão de ExCenter.Domain/Common/LabNumber.cs — a lógica precisa casar entre back e front,
// senão o badge "Fora da faixa" da tela discorda do IsAbnormal gravado no banco.
//
// Motivo de existir (bug visto em produção): "279.000" (plaquetas) era lido como 279 e
// "200 a 1.000" como "200 a 1" — monócitos 370/µL, valor normal, aparecia como alterado em
// todo hemograma. Regra: grupos de EXATAMENTE 3 dígitos, repetidos e sem zero à esquerda,
// são milhar; qualquer outra combinação é decimal.

/** Aceita vários grupos de separador — quem decide o significado é o parser. */
export const LAB_NUMBER_PATTERN = String.raw`[+-]?\d+(?:[.,]\d+)*`;

const THOUSANDS_DOT = /^[+-]?[1-9]\d{0,2}(?:\.\d{3})+$/;
const THOUSANDS_COMMA = /^[+-]?[1-9]\d{0,2}(?:,\d{3})+$/;
const THOUSANDS_DOT_DECIMAL_COMMA = /^[+-]?[1-9]\d{0,2}(?:\.\d{3})+,\d+$/;
const THOUSANDS_COMMA_DECIMAL_DOT = /^[+-]?[1-9]\d{0,2}(?:,\d{3})+\.\d+$/;

export function parseLabNumber(token: string): number | null {
  const t = token.trim();
  if (!t) return null;

  let normalized: string;
  if (THOUSANDS_DOT_DECIMAL_COMMA.test(t)) normalized = t.replace(/\./g, '').replace(',', '.');
  else if (THOUSANDS_COMMA_DECIMAL_DOT.test(t)) normalized = t.replace(/,/g, '');
  else if (THOUSANDS_DOT.test(t)) normalized = t.replace(/\./g, '');
  else if (THOUSANDS_COMMA.test(t)) normalized = t.replace(/,/g, '');
  else normalized = t.replace(',', '.');

  const value = Number.parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

/** Tem separador que NÃO pode ser milhar — logo, é decimal com certeza. */
function isUnambiguousDecimal(token: string): boolean {
  const t = token.trim();
  if (!t.includes('.') && !t.includes(',')) return false; // inteiro puro não diz nada
  return (
    !THOUSANDS_DOT.test(t) &&
    !THOUSANDS_COMMA.test(t) &&
    !THOUSANDS_DOT_DECIMAL_COMMA.test(t) &&
    !THOUSANDS_COMMA_DECIMAL_DOT.test(t)
  );
}

// Dentro de uma mesma faixa, os dois limites são escritos no mesmo formato pelo laboratório.
// Lidos isoladamente, "0.500 a 1.500" viraria "0,5 a 1500" — faixa que engole qualquer valor
// e ESCONDE alteração real (erro silencioso, pior que o falso positivo original).
export function parseLabRange(minToken: string, maxToken: string): [number | null, number | null] {
  if (isUnambiguousDecimal(minToken) || isUnambiguousDecimal(maxToken)) {
    const asDecimal = (t: string) => {
      const v = Number.parseFloat(t.trim().replace(',', '.'));
      return Number.isNaN(v) ? null : v;
    };
    return [asDecimal(minToken), asDecimal(maxToken)];
  }
  return [parseLabNumber(minToken), parseLabNumber(maxToken)];
}
