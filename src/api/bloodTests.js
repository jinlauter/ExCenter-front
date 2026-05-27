import { api } from './client.js';

// ============================================================================
// API de exames de sangue — mapeada de BloodTestsController.cs
// ============================================================================
// Todos os endpoints exigem Authorization: Bearer {accessToken}.
// ============================================================================

// POST /api/bloodtests/upload  (multipart files[])
//   → 202 { batchId, fileCount, message }
//   → 400 { message }
//
// Endpoint assíncrono: o back enfileira os PDFs e processa em background.
// O front mostra "enviado, processando em segundo plano" e direciona o usuário
// para a tela "Exames Enviados" (decisão alinhada com o produto).
export async function uploadBloodTests(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await api.post('/api/bloodtests/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { batchId, fileCount, message }
}

// ──────────────────────────────────────────────────────────────────────────
// Endpoints abaixo NÃO foram pedidos no escopo desta entrega.
// Estão aqui prontos pra uso futuro — TODO: revisar contrato/comportamento
// quando as telas de "Exames enviados" e "Histórico" forem implementadas.
// ──────────────────────────────────────────────────────────────────────────

// GET /api/bloodtests/batch/{batchId} → BatchStatusResponse
export async function getBatchStatus(batchId) {
  const { data } = await api.get(`/api/bloodtests/batch/${batchId}`);
  return data;
}

// POST /api/bloodtests/results/query  → BloodTestResultQueryResponse[]
export async function queryResults(filter = {}) {
  const { data } = await api.post('/api/bloodtests/results/query', filter);
  return data;
}
