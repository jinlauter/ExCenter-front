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

// Mesmo nome de parâmetro pode aparecer com unidades diferentes no mesmo exame (ex:
// "Linfócitos" em % e em /μL) — agrupar só por nome misturaria as duas séries num
// gráfico sem sentido. groupName NÃO entra na chave (a IA às vezes marca o mesmo
// teste com grupo num exame e sem grupo em outro).
function seriesKey(r: BloodTestResultQueryResponse) {
  return `${r.parameterName}__${r.unit ?? ''}`;
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
  for (const r of results) {
    if (r.numericResultValue == null) continue;
    const key = seriesKey(r);
    if (!paramSeries.has(key)) {
      paramSeries.set(key, { key, parameterName: r.parameterName, unit: r.unit, label: r.parameterName, points: [] });
    }
    paramSeries.get(key)!.points.push({
      date: new Date(r.testDate),
      value: r.numericResultValue,
      referenceValue: r.referenceValue,
    });
  }
  for (const series of paramSeries.values()) {
    series.points.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

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

    const series = paramSeries.get(seriesKey(r));
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
