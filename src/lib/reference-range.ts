import { LAB_NUMBER_PATTERN, parseLabNumber, parseLabRange } from '@/lib/lab-number';

export interface ReferenceRange {
  min: number | null;
  max: number | null;
}

// Parseia o texto livre de referenceValue vindo do back (ex: "20,0 a 40,0",
// "Superior a 90", "Normal: Inferior a 5,7%") num intervalo numérico, quando possível.
// Retorna null quando o texto não descreve uma faixa numérica (ex: "Não reagente") ou
// quando descreve várias faixas condicionais (ex: por idade — "17 a 40 anos: X a Y ng/dL
// 41 a 60 anos: ...") — nesses casos não dá pra saber qual sub-faixa vale sem outro dado
// (idade do paciente), e adivinhar a primeira levaria a falsos "fora da faixa".
//
// Os números passam pelo parseLabNumber (mesma regra do back): "200 a 1.000" é 200–1000, e
// não "200 a 1" — a leitura antiga fazia monócitos 370/µL, valor normal, aparecer como
// "Fora da faixa" em todo hemograma.
export function parseReferenceRange(raw?: string | null): ReferenceRange | null {
  if (!raw) return null;

  const ranges = [...raw.matchAll(new RegExp(`(${LAB_NUMBER_PATTERN})\\s*a\\s*(${LAB_NUMBER_PATTERN})`, 'gi'))];
  const upperBounds = [...raw.matchAll(new RegExp(`inferior\\s+a\\s*(${LAB_NUMBER_PATTERN})`, 'gi'))];
  const lowerBounds = [...raw.matchAll(new RegExp(`superior\\s+a\\s*(${LAB_NUMBER_PATTERN})`, 'gi'))];

  // Mais de uma cláusula numérica (de qualquer tipo) indica faixas condicionais — por
  // idade, sexo, categoria de risco etc. Sem saber qual cláusula se aplica ao paciente,
  // adivinhar a primeira gera falsos "fora da faixa" — melhor não afirmar nada.
  const totalClauses = ranges.length + upperBounds.length + lowerBounds.length;
  if (totalClauses !== 1) return null;

  if (ranges.length === 1) {
    // Os dois limites são lidos EM CONJUNTO — ver parseLabRange.
    const [min, max] = parseLabRange(ranges[0]![1]!, ranges[0]![2]!);
    return { min, max };
  }
  if (upperBounds.length === 1) {
    return { min: null, max: parseLabNumber(upperBounds[0]![1]!) };
  }
  return { min: parseLabNumber(lowerBounds[0]![1]!), max: null };
}

export function isOutOfRange(value: number | null | undefined, referenceValue?: string | null) {
  if (value == null) return false;
  const range = parseReferenceRange(referenceValue);
  if (!range) return false;
  if (range.min != null && value < range.min) return true;
  if (range.max != null && value > range.max) return true;
  return false;
}
