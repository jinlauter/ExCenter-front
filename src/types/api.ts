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
  batchId: string;
  fileCount: number;
  message: string;
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
