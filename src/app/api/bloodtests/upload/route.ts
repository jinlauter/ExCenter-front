import { NextResponse } from 'next/server';
import { backendFetchRaw, UnauthenticatedError } from '@/lib/backend';
import { rejectCrossSite } from '@/lib/csrf';
import type { UploadBatchResponse } from '@/types/api';

// =============================================================================
// POST /api/bloodtests/upload (Next BFF)
// =============================================================================
//
// Recebe multipart/form-data do browser (campo "files" com 1+ arquivos),
// repassa para POST /api/bloodtests/upload do .NET com Authorization: Bearer.
//
// Implementação: parsa o FormData do request e reencapsula no fetch para o
// back. Não é o caminho mais eficiente para uploads enormes (carrega o body
// na memória do Next antes de mandar), mas é o mais simples e portável.
// Se um dia for necessário streaming puro, substituir por proxy de
// ReadableStream + preservar o boundary do Content-Type original.
//
// =============================================================================

// PDFs grandes podem demorar — aumentamos o timeout default de Vercel para
// 60s. Em produção (Node servidor próprio) isso não é necessário, mas não
// atrapalha.
export const maxDuration = 60;

export async function POST(request: Request) {
  // CRÍTICO: upload é multipart/form-data — Content-Type "simples" que NÃO
  // dispara preflight CORS. SameSite=Lax sozinho não protege; precisamos
  // checar Origin/Host manualmente.
  const blocked = await rejectCrossSite();
  if (blocked) return blocked;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Form data inválido.' }, { status: 400 });
  }

  const files = formData.getAll('files');
  if (files.length === 0) {
    return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  // Remontamos o FormData. Tecnicamente poderíamos repassar o original
  // direto, mas reescrever garante que só os campos esperados vão pro back.
  const backendForm = new FormData();
  for (const file of files) {
    if (file instanceof File) backendForm.append('files', file, file.name);
  }

  try {
    const response = await backendFetchRaw('/api/bloodtests/upload', {
      method: 'POST',
      body: backendForm,
    });

    const responseBody = await response.text();
    if (!response.ok) {
      // Tenta repassar a mensagem do back de forma controlada.
      try {
        const parsed = JSON.parse(responseBody);
        return NextResponse.json(parsed, { status: response.status });
      } catch {
        return NextResponse.json(
          { message: 'Falha no upload.' },
          { status: response.status || 502 },
        );
      }
    }

    const data = JSON.parse(responseBody) as UploadBatchResponse;
    return NextResponse.json(data, { status: 202 });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Erro inesperado no upload.' }, { status: 502 });
  }
}
