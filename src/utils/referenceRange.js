// Parseia o texto livre de referenceValue vindo do back (ex: "20,0 a 40,0",
// "Superior a 90", "Normal: Inferior a 5,7%") num intervalo numérico, quando possível.
// Retorna null quando o texto não descreve uma faixa numérica (ex: "Não reagente") ou
// quando descreve várias faixas condicionais (ex: por idade — "17 a 40 anos: X a Y ng/dL
// 41 a 60 anos: ...") — nesses casos não dá pra saber qual sub-faixa vale sem outro dado
// (idade do paciente), e adivinhar a primeira levaria a falsos "fora da faixa".
export function parseReferenceRange(raw) {
  if (!raw) return null;

  const toNumber = (match) => parseFloat(match.replace(',', '.'));

  const ranges = [...raw.matchAll(/(-?\d+(?:[.,]\d+)?)\s*a\s*(-?\d+(?:[.,]\d+)?)/gi)];
  const upperBounds = [...raw.matchAll(/inferior\s+a\s*(-?\d+(?:[.,]\d+)?)/gi)];
  const lowerBounds = [...raw.matchAll(/superior\s+a\s*(-?\d+(?:[.,]\d+)?)/gi)];

  // Mais de uma cláusula numérica (de qualquer tipo) indica faixas condicionais — por
  // idade, sexo, categoria de risco etc. Sem saber qual cláusula se aplica ao paciente,
  // adivinhar a primeira gera falsos "fora da faixa" — melhor não afirmar nada.
  const totalClauses = ranges.length + upperBounds.length + lowerBounds.length;
  if (totalClauses !== 1) return null;

  if (ranges.length === 1) {
    return { min: toNumber(ranges[0][1]), max: toNumber(ranges[0][2]) };
  }
  if (upperBounds.length === 1) {
    return { min: null, max: toNumber(upperBounds[0][1]) };
  }
  return { min: toNumber(lowerBounds[0][1]), max: null };
}
