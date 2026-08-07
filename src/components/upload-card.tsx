'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CloudUpload, FileText, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  buildUploadFeedback,
  UploadFeedbackAlert,
  type UploadFeedback,
} from '@/components/upload-feedback-alert';
import type { UploadBatchResponse } from '@/types/api';

const ACCEPTED_MIME = 'application/pdf,image/jpeg,image/jpg,image/png';

// Tipos que o back realmente processa (AnalyzeBloodTestService: PDF vira bloco "file", imagem
// vira "image_url" — nada além disso é suportado pela extração). O `accept` acima é só uma dica
// contornável no seletor nativo; validamos de fato por extensão aqui pra recusar na hora coisas
// sem relação com um documento de exame (.exe, .mp3, .docx, etc.), em vez de deixar o back
// rejeitar com mensagem genérica. Fonte de verdade continua sendo o back (defesa em profundidade).
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

function hasAcceptedExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function hasAcceptedMimeType(mimeType: string) {
  return ACCEPTED_MIME_TYPES.includes(mimeType.toLowerCase());
}

// Aceita por extensão OU por tipo MIME, porque no Android o nome não é confiável: seletores
// que devolvem o arquivo por content:// (galeria e gerenciador de arquivos do MIUI, entre
// outros) entregam nomes gerados sem extensão. Exigir extensão ali recusa foto de laudo
// perfeitamente válida, e o tipo MIME que o próprio browser preencheu é o dado bom nesse caso.
// Continua sendo só triagem local: quem valida de fato é o back, por assinatura de bytes.
function isAcceptedExamFile(file: File) {
  return hasAcceptedExtension(file.name) || hasAcceptedMimeType(file.type);
}

// lastModified entra na identidade porque nome deixou de ser confiável: duas fotos tiradas em
// sequência podem chegar da galeria com o mesmo nome gerado e o mesmo tamanho, e sem ele uma
// das duas sumiria silenciosamente na deduplicação.
function identityOf(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function displayNameOf(file: File) {
  return file.name.trim() || 'arquivo sem nome';
}

// Mesmo limite de contagem do back (AnalyzeBloodTestService.MaxFilesPerBatch). O tamanho total
// de 4MB existe porque o upload passa pela rota BFF do Vercel, que limita o corpo de
// Serverless Functions a 4.5MB — checar aqui evita mandar pro Vercel um lote que ele vai
// rejeitar com um erro genérico sem motivo (mesmo problema já visto no upload de avatar).
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${formatMegabytes(bytes)} MB`;
}

/** Erro é sempre o mesmo formato: mensagem seca, sem título nem lista. */
function errorFeedback(message: string): UploadFeedback {
  return { type: 'error', message };
}

export function UploadCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNavigatingToSent, startNavigateToSent] = useTransition();
  const router = useRouter();

  const fileCount = selectedFiles.length;
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const overCount = fileCount > MAX_FILES;
  const overSize = totalBytes > MAX_TOTAL_BYTES;
  const selectionError = overCount
    ? `Envie no máximo ${MAX_FILES} arquivos por vez. Você selecionou ${fileCount}.`
    : overSize
      ? `O total dos arquivos selecionados (${formatMegabytes(totalBytes)} MB) passa do limite de 4 MB por envio. Selecione menos arquivos ou arquivos menores.`
      : null;
  const canSubmit = fileCount > 0 && !overCount && !overSize && !isPending;

  function trigger() {
    if (isPending) return;
    inputRef.current?.click();
  }

  // ACUMULA na seleção existente (não substitui): o quadrado "+" reabre o seletor nativo, que
  // só devolve os arquivos da nova escolha — sem o merge aqui, escolher mais arquivos apagaria
  // os já selecionados. Dedupe por nome+tamanho cobre o usuário reselecionando o mesmo arquivo.
  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ''; // permite reselecionar mesmo arquivo depois de removê-lo
    if (picked.length === 0) return;

    const rejected = picked.filter((file) => !isAcceptedExamFile(file));
    const accepted = picked.filter((file) => isAcceptedExamFile(file));

    setSelectedFiles((prev) => {
      const existing = new Set(prev.map(identityOf));
      return [...prev, ...accepted.filter((file) => !existing.has(identityOf(file)))];
    });

    if (rejected.length > 0) {
      setFeedback(
        errorFeedback(
          `Só aceitamos PDF e imagens (JPG, PNG). Não dá pra enviar: ${rejected.map(displayNameOf).join(', ')}.`,
        ),
      );
      return;
    }

    setFeedback(null);
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearSelection() {
    setSelectedFiles([]);
    setFeedback(null);
  }

  function submit() {
    if (!canSubmit) return;
    setFeedback(null);

    startTransition(async () => {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      try {
        const res = await fetch('/api/bloodtests/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.status === 401) {
          setFeedback(errorFeedback('Sua sessão expirou. Recarregue a página e faça login novamente.'));
          return;
        }

        const data = (await res.json().catch(() => null)) as
          | UploadBatchResponse
          | { message?: string }
          | null;

        if (!res.ok || !data || !('fileCount' in data)) {
          const backendMessage = data && 'message' in data && data.message;
          setFeedback(
            errorFeedback(
              backendMessage ||
                `Não foi possível enviar os exames. Verifique se são no máximo ${MAX_FILES} arquivos e 4 MB no total, e tente novamente.`,
            ),
          );
          return;
        }

        setFeedback(buildUploadFeedback(data.fileCount, data.duplicateFileNames ?? []));
        setSelectedFiles([]);

        // O card de resumo é renderizado no SERVIDOR (a home busca /files/summary), então o
        // upload — que acontece aqui no cliente — não o atualiza sozinho: o contador só mudava
        // se o usuário recarregasse a página. router.refresh() reexecuta o server component e
        // traz a contagem nova, sem perder o estado desta tela (o aviso de sucesso continua).
        // Só no sucesso: envio recusado não muda contagem nenhuma.
        router.refresh();
      } catch {
        setFeedback(errorFeedback('Falha de rede ao enviar. Verifique sua conexão.'));
      }
    });
  }

  return (
    <div className="space-y-2">
      {feedback && (
        <UploadFeedbackAlert
          feedback={feedback}
          isOpeningSentList={isNavigatingToSent}
          onOpenSentList={() => startNavigateToSent(() => router.push('/exames-enviados'))}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        multiple
        hidden
        onChange={handleFiles}
      />

      {fileCount === 0 ? (
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
          <Button onClick={trigger}>Selecionar PDFs</Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">
            {fileCount} de {MAX_FILES} arquivo{fileCount === 1 ? '' : 's'} selecionado
            {fileCount === 1 ? '' : 's'}
          </h2>

          <div className="flex flex-wrap gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background p-2 text-center"
              >
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={isPending}
                  aria-label={`Remover ${displayNameOf(file)}`}
                  className="absolute right-1 top-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <FileText className="h-7 w-7 text-primary" strokeWidth={1.5} />
                <p className="w-full truncate px-1 text-xs font-medium" title={displayNameOf(file)}>
                  {displayNameOf(file)}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            ))}

            {/* Quadrado "+" no fim da fileira: reabre o seletor e ACUMULA (ver handleFiles). Some
                quando a seleção atinge o limite — adicionar mais só gearia o erro de contagem. */}
            {fileCount < MAX_FILES && (
              <button
                type="button"
                onClick={trigger}
                disabled={isPending}
                className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-primary-lighter bg-primary-light/30 p-2 text-center text-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-7 w-7" strokeWidth={1.5} />
                <span className="px-1 text-xs font-medium leading-tight">Selecionar mais</span>
              </button>
            )}
          </div>

          {selectionError && <UploadFeedbackAlert feedback={errorFeedback(selectionError)} />}

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tamanho total</span>
              <span className={overSize ? 'font-medium text-destructive' : undefined}>
                {formatMegabytes(totalBytes)} MB de {formatMegabytes(MAX_TOTAL_BYTES)} MB
              </span>
            </div>
            <Progress
              value={(totalBytes / MAX_TOTAL_BYTES) * 100}
              indicatorClassName={overSize ? 'bg-destructive' : undefined}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={clearSelection} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                `Enviar ${fileCount} arquivo${fileCount === 1 ? '' : 's'}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
