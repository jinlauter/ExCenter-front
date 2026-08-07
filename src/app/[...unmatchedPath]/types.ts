// Tipos da fila de revisão — CO-LOCADOS na rota camuflada de propósito, e não em types/api.ts:
// nada desta área é importado por código público, então nem nome de tipo vaza para outros
// arquivos. (Tipos não chegam ao bundle, mas higiene de fronteira evita o import acidental.)

export interface ReviewQueueCandidate {
  canonicalAnalyteId: number;
  position: number;
  loincName: string;
  nameInPortuguese: string | null;
  displayName: string | null;
  bestDisplayName: string;
}

export interface ReviewQueueEntry {
  termId: number;
  normalizedName: string;
  normalizedUnit: string;
  sampleOriginalName: string;
  sampleOriginalUnit: string | null;
  sampleMaterial: string | null;
  samplePanelName: string | null;
  sampleLaboratoryName: string | null;
  timesObserved: number;
  status: string;
  stabilityGatePassed: boolean | null;
  unitGatePassed: boolean | null;
  materialGatePassed: boolean | null;
  firstPassChosenAnalyteId: number | null;
  secondPassChosenAnalyteId: number | null;
  candidatesOffered: ReviewQueueCandidate[];
}

export interface ReviewActionResult {
  ok: boolean;
  message?: string;
}
