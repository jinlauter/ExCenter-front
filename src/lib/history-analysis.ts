import type { TrendPoint } from '@/components/trend-chart';
import type { BloodTestResultQueryResponse } from '@/types/api';

const UNGROUPED_LABEL = 'Outros';

export interface ExamInfo {
  testId: string;
  date: Date;
  laboratoryName?: string | null;
}

export interface ResultWithDelta extends BloodTestResultQueryResponse {
  delta: number | null;
}

export interface ParamSeries {
  key: string;
  parameterName: string;
  unit?: string | null;
  label: string;
  points: TrendPoint[];
}

export interface HistoryAnalysis {
  examsSorted: ExamInfo[];
  trendable: ParamSeries[];
  latestExam: ExamInfo | null;
  groups: Map<string, ResultWithDelta[]>;
}

// Chave da série — espelho do HistorySeriesKey do back (se mexer num, mexa no outro):
//
//   MAPEADO (canonicalAnalyteId presente) → (analito, material, unidade). O analito cruza
//   grafias entre laboratórios ("Colesterol" e "COLESTEROL TOTAL" viram uma série); o material
//   separa soro de urina (mesmo analito, exames incomparáveis); a unidade fica na chave
//   enquanto não houver conversão (mg/dL e mmol/L na mesma linha seria um gráfico mentiroso).
//
//   NÃO-MAPEADO → (nome, unidade) exatos, o comportamento pré-dicionário. groupName NÃO entra
//   na chave (a IA às vezes marca o mesmo teste com grupo num exame e sem grupo em outro).
const KEY_SEPARATOR = '\u001f';

function historySeriesKey(r: BloodTestResultQueryResponse): string {
  if (r.canonicalAnalyteId != null) {
    return ['analyte', r.canonicalAnalyteId, comparableForm(r.material), comparableForm(r.unit)].join(KEY_SEPARATOR);
  }
  return ['name', r.parameterName, r.unit ?? ''].join(KEY_SEPARATOR);
}

// Forma comparável de um texto de laudo: sem acento, sem caixa, sem pontuação. É o que faz
// "Soro"/"SORO" e "mg/dL"/"MG/DL" caírem no mesmo balde sem inventar um normalizador novo.
function comparableForm(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

interface SpellingOccurrence {
  exactName: string;
  date: Date;
}

// O rótulo da série é a grafia ORIGINAL que MAIS APARECEU entre os resultados agrupados —
// 6 exames do mesmo analito, 3 escritos "TGO": a série chama "TGO". A contagem é insensível
// a caixa/acento/pontuação (senão "TGO" e "tgo" dividiriam o voto), mas o que se exibe é a
// forma exata mais comum. Empate — de família ou de grafia — decide pelo mais recente: o
// nome que o laboratório atual da pessoa usa.
function mostFrequentSpelling(occurrences: SpellingOccurrence[]): string {
  interface Tally { count: number; latest: number; }
  const families = new Map<string, { total: Tally; byExactName: Map<string, Tally> }>();

  for (const { exactName, date } of occurrences) {
    const familyKey = comparableForm(exactName);
    const family = families.get(familyKey) ?? { total: { count: 0, latest: 0 }, byExactName: new Map() };
    families.set(familyKey, family);

    family.total.count += 1;
    family.total.latest = Math.max(family.total.latest, date.getTime());

    const spelling = family.byExactName.get(exactName) ?? { count: 0, latest: 0 };
    spelling.count += 1;
    spelling.latest = Math.max(spelling.latest, date.getTime());
    family.byExactName.set(exactName, spelling);
  }

  const winningFamily = [...families.values()]
    .sort((a, b) => b.total.count - a.total.count || b.total.latest - a.total.latest)[0];
  if (!winningFamily) return '';

  return [...winningFamily.byExactName.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.latest - a.latest)[0]![0];
}

// Extraído do HistoryView pra poder testar a lógica de agrupamento/tendência sem
// precisar renderizar o componente.
export function computeHistoryAnalysis(results: BloodTestResultQueryResponse[]): HistoryAnalysis {
  const exams = new Map<string, ExamInfo>();
  for (const r of results) {
    if (!exams.has(r.testId)) {
      exams.set(r.testId, { testId: r.testId, date: new Date(r.testDate), laboratoryName: r.laboratoryName });
    }
  }
  const examsSorted = [...exams.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  const paramSeries = new Map<string, ParamSeries>();
  const spellingsBySeries = new Map<string, SpellingOccurrence[]>();
  for (const r of results) {
    if (r.numericResultValue == null) continue;
    const key = historySeriesKey(r);
    if (!paramSeries.has(key)) {
      paramSeries.set(key, { key, parameterName: r.parameterName, unit: r.unit, label: r.parameterName, points: [] });
      spellingsBySeries.set(key, []);
    }
    paramSeries.get(key)!.points.push({
      date: new Date(r.testDate),
      value: r.numericResultValue,
      referenceValue: r.referenceValue,
      laboratoryName: r.laboratoryName,
      requestingDoctor: r.requestingDoctor,
    });
    spellingsBySeries.get(key)!.push({ exactName: r.parameterName, date: new Date(r.testDate) });
  }
  for (const series of paramSeries.values()) {
    series.points.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // O nome da série é a grafia mais frequente entre os resultados agrupados (uma série
  // canônica pode juntar "Colesterol" e "COLESTEROL TOTAL" — alguém precisa vencer).
  for (const series of paramSeries.values()) {
    series.parameterName = mostFrequentSpelling(spellingsBySeries.get(series.key) ?? []);
  }

  // Duas séries podem terminar com o MESMO nome (ex.: mesmo analito em unidades diferentes,
  // como Linfócitos em % e em /μL) — a unidade desambigua no rótulo final.
  const nameOccurrences = new Map<string, number>();
  for (const series of paramSeries.values()) {
    nameOccurrences.set(series.parameterName, (nameOccurrences.get(series.parameterName) ?? 0) + 1);
  }
  for (const series of paramSeries.values()) {
    series.label =
      (nameOccurrences.get(series.parameterName) ?? 0) > 1 && series.unit
        ? `${series.parameterName} (${series.unit})`
        : series.parameterName;
  }

  const trendable = [...paramSeries.values()]
    .filter((s) => s.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length);

  const latestExam = examsSorted[examsSorted.length - 1] ?? null;
  const latestResults = latestExam ? results.filter((r) => r.testId === latestExam.testId) : [];

  const groups = new Map<string, ResultWithDelta[]>();
  for (const r of latestResults) {
    const key = r.groupName || UNGROUPED_LABEL;
    if (!groups.has(key)) groups.set(key, []);

    const series = paramSeries.get(historySeriesKey(r));
    let delta: number | null = null;
    if (r.numericResultValue != null && series && latestExam) {
      const priorPoints = series.points.filter((p) => p.date < latestExam.date);
      if (priorPoints.length > 0) {
        delta = r.numericResultValue - priorPoints[priorPoints.length - 1]!.value;
      }
    }
    groups.get(key)!.push({ ...r, delta });
  }

  return { examsSorted, trendable, latestExam, groups };
}
