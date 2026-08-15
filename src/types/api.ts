// =============================================================================
// Tipos espelhando os DTOs do back .NET (ExCenter-back/ExCenter.Application/DTOs).
// Mantenha sincronizado quando o back mudar. Onde possível, validar bodies de
// requests externas com zod antes de tipar como qualquer um destes.
// =============================================================================

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  /** JWT de acesso (1 hora). Enviar em Authorization: Bearer ... */
  accessToken: string;
  /** ISO timestamp de expiração do accessToken. */
  expiresAt: string;
  username: string;
  /**
   * Refresh token bruto. Devolvido no body para clientes BFF (caso nosso) que
   * preferem evitar parsing manual de Set-Cookie. Para clientes SPA puros,
   * este campo deve ser ignorado e o cookie httpOnly refresh_token usado.
   */
  refreshToken?: string;
  /** ISO timestamp de expiração do refresh token. */
  refreshTokenExpiresAt?: string;
}

/** Body opcional aceito por POST /api/auth/refresh quando o cliente prefere body em vez de cookie. */
export interface RefreshRequest {
  refreshToken?: string;
}

export interface MeResponse {
  userId: string;
  username: string;
}

// ── Blood tests ────────────────────────────────────────────────────────────

export interface UploadBatchResponse {
  // Nulo quando todos os arquivos enviados eram duplicatas — nenhum batch chega a ser criado.
  batchId: string | null;
  fileCount: number;
  /** Nomes dos arquivos barrados por já terem sido enviados antes, na ordem de seleção. */
  duplicateFileNames: string[];
  /** Derivado de duplicateFileNames no back — os dois nunca divergem. */
  duplicateCount: number;
  message: string;
}

// Resumo dos arquivos enviados (card da home). Fala em ARQUIVOS: nem todo arquivo vira exame.
export interface SentFilesSummaryResponse {
  total: number;
  pending: number;
  processing: number;
  retrying: number;
  failed: number;
  /** Processado com sucesso E reconhecido como exame de sangue. */
  done: number;
  /** Processado, mas a IA concluiu que o documento não é exame de sangue. */
  notExam: number;
}

// Página de "Exames enviados" — paginação/ordenação/busca acontecem no back
// (GET /api/bloodtests/files?page=&pageSize=&sortBy=&sortDir=&search=).
export interface SentFilesPageResponse {
  items: SentFileResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface BatchFileStatusDto {
  fileName: string;
  status: string;
  testId?: string | null;
  isValidExam?: boolean | null;
  invalidReason?: string | null;
  errorMessage?: string | null;
  processedAt?: string | null;
}

export interface BatchStatusResponse {
  batchId: string;
  patientName: string;
  total: number;
  pending: number;
  processing: number;
  done: number;
  failed: number;
  overallStatus: string;
  files: BatchFileStatusDto[];
}

export interface BloodTestResultFilterRequest {
  parameterName?: string;
  groupName?: string;
  laboratoryName?: string;
  isAbnormal?: boolean;
  fromDate?: string;
  minValue?: number;
  maxValue?: number;
}

export interface BloodTestResultQueryResponse {
  resultId: string;
  testId: string;
  patientName: string;
  laboratoryName?: string | null;
  /** Médico que pediu o exame — alimenta o tooltip de procedência do gráfico (lab + médico). */
  requestingDoctor?: string | null;
  testDate: string;
  parameterName: string;
  groupName?: string | null;
  numericResultValue?: number | null;
  stringResultValue?: string | null;
  unit?: string | null;
  referenceValue?: string | null;
  /** Faixa de NORMALIDADE estruturada extraída pela IA (inclusiva; um lado null = sem limite).
   *  Alimenta banda/cor de gráfico; o texto de referenceValue segue sendo o exibido. */
  referenceMin?: number | null;
  referenceMax?: number | null;
  isAbnormal?: boolean | null;
  /** Analito canônico do termo mapeado (null enquanto o dicionário não mapeou). É o que cruza
   *  séries entre laboratórios — ver history-analysis.ts. */
  canonicalAnalyteId?: number | null;
  /** Material biológico impresso no laudo ("Soro", "Urina") — separa séries incomparáveis. */
  material?: string | null;
}

export interface SentFileResponse {
  fileId: string;
  batchId: string;
  fileName: string;
  status: string;
  sentAt: string;
  processedAt?: string | null;
  testId?: string | null;
  isValidExam?: boolean | null;
  invalidReason?: string | null;
  errorMessage?: string | null;
  examDate?: string | null;
  requestingDoctor?: string | null;
}

// ── Resultado de exames (tela principal do médico/usuário) ─────────────────

export interface ProcessedExamListItem {
  testId: string;
  examDate?: string | null;
  requestingDoctor?: string | null;
  laboratoryName?: string | null;
  /** Painéis/exames do laudo (ex: "Hemograma"), deduplicados, na ordem do documento. */
  includedExams: string[];
  resultCount: number;
  abnormalCount: number;
}

export interface ProcessedExamsPageResponse {
  items: ProcessedExamListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ── Detalhe de um exame (template estilo laudo, /resultados/[testId]) ──────

export interface ExamHistoryPoint {
  date: string;
  value: number;
  referenceValue?: string | null;
  /** Procedência do ponto para o tooltip do gráfico: onde foi medido e quem pediu. */
  laboratoryName?: string | null;
  requestingDoctor?: string | null;
}

export interface ExamDetailResult {
  resultId: string;
  parameterName: string;
  numericResultValue?: number | null;
  stringResultValue?: string | null;
  unit?: string | null;
  referenceValue?: string | null;
  /** Faixa de NORMALIDADE estruturada extraída pela IA (inclusiva; um lado null = sem limite).
   *  Presente, dispensa o parse textual; ausente (linha antiga), resolveReferenceRange cai nele. */
  referenceMin?: number | null;
  referenceMax?: number | null;
  isAbnormal?: boolean | null;
  /** Série histórica do usuário (nome+unidade exatos), ordenada por data, com este exame incluso. */
  history: ExamHistoryPoint[];
}

export interface ExamDetailGroup {
  name: string;
  /** true = exame avulso (o "grupo" é o próprio exame, não repetir o nome no corpo). */
  isSingle: boolean;
  material?: string | null;
  method?: string | null;
  results: ExamDetailResult[];
}

export interface ExamDetailResponse {
  testId: string;
  examDate?: string | null;
  requestingDoctor?: string | null;
  laboratoryName?: string | null;
  abnormalCount: number;
  resultCount: number;
  /** Arquivo original (laudo) de origem — habilita ver/baixar o original no detalhe.
   *  Null quando o exame nasceu sem arquivo (endpoint /analyze): botões ficam desabilitados. */
  sourceFileId?: string | null;
  sourceFileName?: string | null;
  groups: ExamDetailGroup[];
}

// ── User profile (tela de Configurações) ───────────────────────────────────

export interface UserProfileResponse {
  userId: string;
  username: string;
  email?: string | null;
  dateOfBirth?: string | null;
  bloodType?: string | null;
  biologicalSex?: string | null;
  preferredLanguage: string;
  avatarUpdatedAt?: string | null;
  /** Código do plano da conta (Free/Personal/Unlimited) — alimenta o badge. Ver lib/plans. */
  plan: string;
}

export interface UpdatePersonalInfoRequest {
  username: string;
  dateOfBirth?: string | null;
  bloodType?: string | null;
  biologicalSex?: string | null;
}

export interface UpdateLanguageRequest {
  preferredLanguage: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ── Cadastro ────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  /** Data ISO curta: YYYY-MM-DD. */
  dateOfBirth: string;
}
