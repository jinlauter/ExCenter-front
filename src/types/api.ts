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
  duplicateCount: number;
  message: string;
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
  testDate: string;
  parameterName: string;
  groupName?: string | null;
  numericResultValue?: number | null;
  stringResultValue?: string | null;
  unit?: string | null;
  referenceValue?: string | null;
  isAbnormal?: boolean | null;
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
