'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, RefreshCw, Download, Eye, Info, CloudUpload, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { cn } from '@/lib/utils';
import type { SentFileResponse } from '@/types/api';

const FILE_NAME_MAX_LENGTH = 50;

function truncateFileName(name: string) {
  if (!name || name.length <= FILE_NAME_MAX_LENGTH) return name;
  return `${name.slice(0, FILE_NAME_MAX_LENGTH)}...`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  retrying: 'Tentando novamente',
  done: 'Concluído',
  failed: 'Falhou',
};

// Cores no padrão dos tokens do tema (ver globals.css) — "retrying" e "processing"
// usam âmbar/azul do Tailwind, já que não há token semântico dedicado pra eles.
const STATUS_CLASS: Record<string, string> = {
  pending: 'border-border bg-transparent text-muted-foreground',
  processing: 'border-blue-200 bg-blue-50 text-blue-700',
  retrying: 'border-amber-300 bg-amber-50 text-amber-700',
  done: 'border-success/30 bg-success/10 text-success',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function getStatusDisplay(file: SentFileResponse) {
  if (file.status === 'done' && file.isValidExam === false) {
    return { label: 'Não é exame de sangue', className: STATUS_CLASS.retrying };
  }
  return {
    label: STATUS_LABEL[file.status] ?? file.status,
    className: STATUS_CLASS[file.status] ?? STATUS_CLASS.pending,
  };
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatExamDate(value: string) {
  // timeZone: 'UTC' evita a data "voltar um dia" em fusos negativos (ex: BRT) — o valor
  // vem como meia-noite UTC (data pura, sem hora relevante), então converter pro fuso
  // local do navegador pode cair no dia anterior.
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function compareNullableDatesDesc(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1; // sem data do exame vai pro fim
  if (!b) return -1;
  return new Date(b).getTime() - new Date(a).getTime();
}

function compareNullableStringsAsc(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1; // sem médico solicitante vai pro fim
  if (!b) return -1;
  return a.localeCompare(b, 'pt-BR');
}

// Ordem: data do exame desc (mais recente primeiro), médico solicitante asc, data de envio asc.
function compareFiles(a: SentFileResponse, b: SentFileResponse): number {
  const examCmp = compareNullableDatesDesc(a.examDate, b.examDate);
  if (examCmp !== 0) return examCmp;

  const doctorCmp = compareNullableStringsAsc(a.requestingDoctor, b.requestingDoctor);
  if (doctorCmp !== 0) return doctorCmp;

  return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
}

const IN_PROGRESS_STATUSES = new Set(['pending', 'processing', 'retrying']);

// "Data do exame" e "Médico solicitante" vêm da extração por IA, então cada célula depende do
// estágio de processamento do arquivo, não só de ter ou não valor:
//   - ainda em andamento (pending/processing/retrying) e vazio → tooltip "pode vir a preencher"
//   - concluído com exame válido e vazio → tooltip "não foi possível extrair"
//   - falhou, ou concluído mas não é exame → célula em branco (não faz sentido mostrar nada)
function ExtractedFieldCell({
  file,
  value,
  format,
}: {
  file: SentFileResponse;
  value?: string | null;
  format: (value: string) => string;
}) {
  const isInvalidExam = file.status === 'done' && file.isValidExam === false;
  if (file.status === 'failed' || isInvalidExam) return null;

  if (value) return <>{format(value)}</>;

  if (IN_PROGRESS_STATUSES.has(file.status)) {
    return (
      <Tooltip content="Ainda em processamento — se essa informação estiver no exame, será preenchida automaticamente.">
        <span className="cursor-help text-muted-foreground">—</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Não foi possível extrair essa informação do exame.">
      <span className="cursor-help text-muted-foreground">—</span>
    </Tooltip>
  );
}

export function SentExamsView({ files }: { files: SentFileResponse[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, startRefresh] = useTransition();
  const [previewFile, setPreviewFile] = useState<SentFileResponse | null>(null);

  const filteredFiles = files
    .filter((file) => file.fileName.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    .sort(compareFiles);

  return (
    <div>
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium">Exames enviados</h1>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Acompanhe o processamento dos arquivos que você enviou.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Atualizar"
          disabled={isRefreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Atalho permanente pro upload: quem acompanha processamento aqui é quem tem exame novo
          pra mandar — sem isso, o caminho de volta pro envio (na home) fica escondido. Só some
          no estado vazio, que já tem o próprio convite de envio. */}
      {files.length > 0 && (
        <Link
          href="/home"
          className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-primary-lighter bg-primary-light/30 px-4 py-3 transition-colors hover:bg-primary-light/60"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light">
            <CloudUpload className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Tem mais exames pra enviar?</p>
            <p className="text-xs text-muted-foreground">
              Envie novos PDFs ou imagens — o processamento começa na hora e você acompanha por aqui.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        </Link>
      )}

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome do arquivo..."
          className="bg-card pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {files.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-base font-medium">Nenhum exame enviado ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Quando você enviar PDFs ou imagens de exames, eles aparecerão aqui com o status do
            processamento.
          </p>
          <Link href="/home" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Clique aqui para enviar exames
          </Link>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-base font-medium">Nenhum arquivo encontrado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Nenhum arquivo corresponde à busca &ldquo;{searchTerm}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Data do exame</th>
                <th className="px-4 py-3 text-left font-medium">Médico solicitante</th>
                <th className="px-4 py-3 text-left font-medium">Enviado em</th>
                <th className="px-4 py-3 text-left font-medium">Processado em</th>
                <th className="px-4 py-3 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const statusDisplay = getStatusDisplay(file);
                const isInvalidExam = file.status === 'done' && file.isValidExam === false;
                const statusReason = isInvalidExam ? file.invalidReason : null;

                return (
                  <tr key={file.fileId} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5" title={file.fileName}>
                      {truncateFileName(file.fileName)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusDisplay.className}`}
                        >
                          {statusDisplay.label}
                        </span>
                        {statusReason && (
                          <span
                            title={`O sistema interpretou que este arquivo é: "${statusReason}"`}
                            className="cursor-help"
                          >
                            <Info className="h-3.5 w-3.5 text-amber-600" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <ExtractedFieldCell file={file} value={file.examDate} format={formatExamDate} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <ExtractedFieldCell file={file} value={file.requestingDoctor} format={(v) => v} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(file.sentAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(file.processedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Visualizar arquivo"
                          onClick={() => setPreviewFile(file)}
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 text-primary')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={`/api/bloodtests/files/${file.fileId}/download`}
                          download={file.fileName}
                          title="Baixar arquivo original"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 text-primary')}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          fileId={previewFile.fileId}
          fileName={previewFile.fileName}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
