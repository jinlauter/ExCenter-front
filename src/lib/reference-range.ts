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
// Rótulo de faixa etária no início de texto de LINHA ÚNICA: "17 a 40 anos: 82 a 626 ng/dL".
// A IA escolhe a linha da tabela estratificada aplicável ao paciente e a transcreve verbatim —
// o rótulo vem junto, e ele é ELE MESMO um intervalo numérico: sem descartá-lo, o texto contaria
// duas cláusulas e cairia na regra de segurança logo abaixo. Só em linha única: num texto
// multilinha cada linha é um estrato, e descartar rótulos ali seria escolher estrato por conta
// própria. Espelho de ReferenceRangeEvaluator.AgeLabelPrefix no back.
// O prefixo opcional de sexo e a forma com comparador cobrem "Masculino > 21 anos: até 39,8" —
// caso real em que o "> 21" do rótulo virava uma segunda cláusula. Sem "anos", rótulo de sexo
// puro ("Masculino: De 143 a 842") nem precisa de descarte: não é intervalo numérico.
// Conector de faixa por extenso: "13,0 a 17,0" e "de 2,0 até 10,0". Definido UMA vez porque as
// duas regras que precisam dele (o rótulo etário abaixo e a faixa em parseReferenceRange) não
// podem divergir — um "até" reconhecido só num dos lados faz o rótulo virar segunda cláusula.
//
// O fecho de "até" é um lookahead de letra, NÃO um `\b`: sem a flag `u`, o `\b` do JavaScript usa
// [A-Za-z0-9_], então "é" não é caractere de palavra e `\baté\b` NUNCA casa — "é" seguido de
// espaço são dois não-palavra, sem transição. No .NET do back o `\b` é Unicode-aware e o mesmo
// padrão funciona; é a divergência que faz um regex copiado de lá falhar em silêncio aqui.
const RANGE_CONNECTOR = '(?:\\ba\\b|\\baté(?![a-zà-ÿ]))';

const AGE_LABEL_PREFIX = new RegExp(
  `^\\s*(?:masculino|feminino|homens|mulheres)?\\s*[:,]?\\s*(?:[<>]=?\\s*\\d+|(?:de\\s+)?\\d+\\s*(?:${RANGE_CONNECTOR}|[-–])\\s*\\d+|(?:acima|abaixo|a\\s+partir)\\s+de\\s+\\d+)\\s*anos\\b[^:\\n]*:\\s*`,
  'i',
);

export function parseReferenceRange(rawText?: string | null): ReferenceRange | null {
  if (!rawText) return null;

  const isSingleLine = !rawText.includes('\n');
  const raw = isSingleLine ? rawText.replace(AGE_LABEL_PREFIX, '') : rawText;

  // O conector "e" SÓ é aceito atrás de "entre" ("Entre 15 e 40") — solto, "e" aparece em
  // prosa comum e casaria pares de números que não são faixa nenhuma.
  //
  // "até" é conector de faixa tanto quanto "a" ("de 2,0 até 10,0 %"), e labs brasileiros usam as
  // duas formas — inclusive no mesmo analito ao longo do tempo. Sem ele, o texto não parseava,
  // isOutOfRange devolvia false em silêncio e valor alterado aparecia como normal. Medido numa
  // série real de Monócitos: 9 dos 17 pontos usavam "até". Mesmo conector do
  // ReferenceRangeEvaluator.BetweenWords no back — ver RANGE_CONNECTOR.
  const ranges = [
    ...raw.matchAll(
      new RegExp(`(${LAB_NUMBER_PATTERN})\\s*${RANGE_CONNECTOR}\\s*(${LAB_NUMBER_PATTERN})`, 'gi'),
    ),
    ...raw.matchAll(new RegExp(`\\bentre\\s+(${LAB_NUMBER_PATTERN})\\s+e\\s+(${LAB_NUMBER_PATTERN})`, 'gi')),
  ];
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

// Resolve a faixa a usar em gráfico/banda: PREFERE a estruturada extraída pela IA no back
// (referenceMin/referenceMax — resolve referência multi-faixa tipo HbA1c, que o parse textual
// corretamente recusa) e só cai no parseReferenceRange quando nenhum limite veio (linha gravada
// antes da extração estruturada existir). O texto de referenceValue segue sendo o EXIBIDO — este
// resolvedor é só pra máquina.
export function resolveReferenceRange(
  referenceMin?: number | null,
  referenceMax?: number | null,
  referenceValueText?: string | null,
): ReferenceRange | null {
  if (referenceMin != null || referenceMax != null) {
    return { min: referenceMin ?? null, max: referenceMax ?? null };
  }
  return parseReferenceRange(referenceValueText);
}

// Um valor cai FORA de uma faixa já parseada. Base compartilhada por isOutOfRange (que parte do
// texto livre) e pelos consumidores que já têm a ReferenceRange em mãos — o gráfico usa a faixa da
// banda exibida para colorir todos os pontos, sem re-parsear o texto de cada um.
export function isValueOutsideRange(value: number | null | undefined, range: ReferenceRange | null) {
  if (value == null || !range) return false;
  if (range.min != null && value < range.min) return true;
  if (range.max != null && value > range.max) return true;
  return false;
}

export function isOutOfRange(value: number | null | undefined, referenceValue?: string | null) {
  return isValueOutsideRange(value, parseReferenceRange(referenceValue));
}
