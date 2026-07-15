'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UploadBatchResponse } from '@/types/api';

const ACCEPTED_MIME = 'application/pdf,image/jpeg,image/jpg,image/png';

// Mesmo limite de contagem do back (AnalyzeBloodTestService.MaxFilesPerBatch). O tamanho total
// de 4MB existe porque o upload passa pela rota BFF do Vercel, que limita o corpo de
// Serverless Functions a 4.5MB — checar aqui evita mandar pro Vercel um lote que ele vai
// rejeitar com um erro genérico sem motivo (mesmo problema já visto no upload de avatar).
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

export function UploadCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();

  function trigger() {
    if (isPending) return;
    inputRef.current?.click();
  }

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // permite reselecionar mesmo arquivo
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      setFeedback({
        type: 'error',
        message: `Envie no máximo ${MAX_FILES} arquivos por vez. Você selecionou ${files.length}.`,
      });
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setFeedback({
        type: 'error',
        message: `O total dos arquivos selecionados (${formatMegabytes(totalBytes)} MB) passa do limite de 4 MB por envio. Selecione menos arquivos ou arquivos menores.`,
      });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      try {
        const res = await fetch('/api/bloodtests/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.status === 401) {
          setFeedback({
            type: 'error',
            message: 'Sua sessão expirou. Recarregue a página e faça login novamente.',
          });
          return;
        }

        const data = (await res.json().catch(() => null)) as
          | UploadBatchResponse
          | { message?: string }
          | null;

        if (!res.ok || !data || !('fileCount' in data)) {
          const backendMessage = data && 'message' in data && data.message;
          setFeedback({
            type: 'error',
            message:
              backendMessage ||
              `Não foi possível enviar os exames. Verifique se são no máximo ${MAX_FILES} arquivos e 4 MB no total, e tente novamente.`,
          });
          return;
        }

        setFeedback({
          type: 'success',
          message: `${data.fileCount} arquivo(s) enviado(s). O processamento ocorre em segundo plano — acompanhe em "Exames enviados".`,
        });
      } catch {
        setFeedback({
          type: 'error',
          message: 'Falha de rede ao enviar. Verifique sua conexão.',
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      {feedback && (
        <Alert variant={feedback.type === 'success' ? 'success' : 'destructive'}>
          <AlertDescription>
            {feedback.message}
            {feedback.type === 'success' && (
              <>
                {' '}
                <Link
                  href="/exames-enviados"
                  className="font-medium text-primary hover:underline"
                >
                  Ver agora
                </Link>
                .
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        multiple
        hidden
        onChange={handleFiles}
      />

      <div className="rounded-3xl border border-dashed border-primary-lighter bg-card p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-light">
          <CloudUpload className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-medium">Envie seus exames</h2>
        <p className="mx-auto mb-1 mt-1 max-w-sm text-sm text-muted-foreground">
          Selecione um ou mais PDFs. Processamos automaticamente em segundo plano.
        </p>
        <p className="mx-auto mb-5 max-w-sm text-xs text-muted-foreground/80">
          Até {MAX_FILES} arquivos por vez, {formatMegabytes(MAX_TOTAL_BYTES)} MB no total.
        </p>
        <Button onClick={trigger} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : (
            'Selecionar PDFs'
          )}
        </Button>
      </div>
    </div>
  );
}
