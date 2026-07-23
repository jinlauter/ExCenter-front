'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  RefreshCw,
  Download,
  Eye,
  Info,
  CloudUpload,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { cn } from '@/lib/utils';
import type { SentFileResponse, SentFilesPageResponse } from '@/types/api';

const FILE_NAME_MAX_LENGTH = 50;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

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

// Colunas ordenáveis — a chave é a aceita pelo back (whitelist SentFileSortField). Direção
// default por coluna: datas começam desc (mais recente primeiro é o que se quer ver), textos asc.
const SORTABLE_COLUMNS: { key: string; label: string; defaultDir: 'asc' | 'desc' }[] = [
  { key: 'fileName', label: 'Arquivo', defaultDir: 'asc' },
  { key: 'status', label: 'Status', defaultDir: 'asc' },
  { key: 'examDate', label: 'Data do exame', defaultDir: 'desc' },
  { key: 'requestingDoctor', label: 'Médico solicitante', defaultDir: 'asc' },
  { key: 'sentAt', label: 'Enviado em', defaultDir: 'desc' },
  { key: 'processedAt', label: 'Processado em', defaultDir: 'desc' },
];

interface SentExamsViewProps {
  data: SentFilesPageResponse;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  search: string;
}

// Paginação/ordenação/busca são SERVER-SIDE (o back nunca devolve tudo) e vivem na URL —
// cabeçalho clicado, página trocada ou busca digitada viram router.push de searchParams, o
// server component refaz a query e este componente re-renderiza com a página nova. URL
// compartilhável e sem estado duplicado entre client e servidor.
export function SentExamsView({ data, sortBy, sortDir, search }: SentExamsViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isRefreshing, startRefresh] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const [previewFile, setPreviewFile] = useState<SentFileResponse | null>(null);

  function pushParams(next: Partial<{ page: number; pageSize: number; sortBy: string; sortDir: string; q: string }>) {
    const merged = {
      page: data.page,
      pageSize: data.pageSize,
      sortBy,
      sortDir,
      q: search,
      ...next,
    };

    // Só o que difere do default entra na URL — mantém endereços limpos e compartilháveis.
    const qs = new URLSearchParams();
    if (merged.page > 1) qs.set('page', String(merged.page));
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) qs.set('pageSize', String(merged.pageSize));
    if (merged.sortBy !== 'examDate' || merged.sortDir !== 'desc') {
      qs.set('sortBy', merged.sortBy);
      qs.set('sortDir', merged.sortDir);
    }
    if (merged.q) qs.set('q', merged.q);

    const query = qs.toString();
    startNavigation(() => router.push(query ? `/exames-enviados?${query}` : '/exames-enviados'));
  }

  function toggleSort(column: (typeof SORTABLE_COLUMNS)[number]) {
    if (sortBy === column.key) {
      pushParams({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      pushParams({ sortBy: column.key, sortDir: column.defaultDir, page: 1 });
    }
  }

  function onSearchChange(value: string) {
    setSearchTerm(value);
    clearTimeout(searchDebounceRef.current);
    // Debounce: uma navegação (e uma query no back) por pausa de digitação, não por tecla.
    searchDebounceRef.current = setTimeout(() => pushParams({ q: value.trim(), page: 1 }), 400);
  }

  const neverSentAnything = data.totalCount === 0 && !search;
  const rangeStart = (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(data.page * data.pageSize, data.totalCount);

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
      {!neverSentAnything && (
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

      {!neverSentAnything && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do arquivo..."
            className="bg-card pl-9"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {neverSentAnything ? (
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
      ) : data.totalCount === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-base font-medium">Nenhum arquivo encontrado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Nenhum arquivo corresponde à busca &ldquo;{search}&rdquo;.
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'overflow-x-auto rounded-lg border border-border bg-card transition-opacity',
              isNavigating && 'opacity-60',
            )}
          >
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {SORTABLE_COLUMNS.map((column) => {
                    const isActive = sortBy === column.key;
                    return (
                      <th key={column.key} className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className={cn(
                            'inline-flex items-center gap-1 font-medium transition-colors hover:text-primary',
                            isActive && 'text-primary',
                          )}
                        >
                          {column.label}
                          {isActive &&
                            (sortDir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-right font-medium">Download</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((file) => {
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Mostrando {rangeStart}–{rangeEnd} de {data.totalCount}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Por página
                <Select
                  className="h-8 w-[72px]"
                  value={String(data.pageSize)}
                  onChange={(e) => pushParams({ pageSize: Number(e.target.value), page: 1 })}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Página anterior"
                  disabled={data.page <= 1 || isNavigating}
                  onClick={() => pushParams({ page: data.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[90px] text-center">
                  Página {data.page} de {Math.max(data.totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Próxima página"
                  disabled={data.page >= data.totalPages || isNavigating}
                  onClick={() => pushParams({ page: data.page + 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
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
