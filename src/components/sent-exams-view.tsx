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
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Toast } from '@/components/ui/toast';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { NavBanner } from '@/components/nav-banner';
import { cn } from '@/lib/utils';
import { useDelayedFlag } from '@/lib/use-delayed-flag';
import { STATUS_CLASS, STATUS_LABEL, NOT_EXAM_CLASS, NOT_EXAM_LABEL } from '@/lib/exam-status';
import type { SentFileResponse, SentFilesPageResponse } from '@/types/api';

const FILE_NAME_MAX_LENGTH = 50;
// 22 caracteres cabem "Jean Rodrigo Tafarel" e "Marcela Robl" inteiros — nomes com dois
// sobrenomes é que passam ("Luis Eduardo Agner Machado Martins"). Sem o corte, essa coluna
// era a que mais empurrava a largura da tabela, já que o nome vem inteiro do laudo.
const DOCTOR_NAME_MAX_LENGTH = 22;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function truncate(value: string, maxLength: number) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function getStatusDisplay(file: SentFileResponse) {
  if (file.status === 'done' && file.isValidExam === false) {
    return { label: NOT_EXAM_LABEL, className: NOT_EXAM_CLASS };
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
  /** Devolve ReactNode (não string) porque a célula do médico envolve o valor num Tooltip. */
  format: (value: string) => React.ReactNode;
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

// Só arquivo parado pode ser excluído. Processing = o worker está com ele agora; Retrying = ele
// volta pra fila e pode ser reivindicado a qualquer momento. Apagar nesses estados deixaria o
// processamento gravar um exame sem arquivo por trás, visível no Histórico e impossível de
// excluir pela interface. O back aplica a mesma regra (409) — aqui é só pra avisar antes.
const UNDELETABLE_STATUSES = new Set(['processing', 'retrying']);

// Textos da confirmação por situação do arquivo. O contador de espera aparece SÓ no exame
// processado com sucesso: é o único caso em que existe dado extraído (resultados, histórico,
// gráficos) que some junto. Exigir 3 segundos de espera pra apagar um PDF que a IA nem
// reconheceu como exame seria atrito sem motivo — e atrito sem motivo é o que faz o usuário
// parar de ler as confirmações que importam.
function buildDeleteCopy(file: SentFileResponse) {
  const isProcessedExam = file.status === 'done' && file.isValidExam === true;

  if (isProcessedExam) {
    return {
      title: 'Excluir este exame?',
      description:
        'O arquivo e todos os resultados extraídos dele serão apagados de forma permanente. Não tem como recuperar depois.',
      countdownSeconds: 3,
    };
  }

  const isInvalidExam = file.status === 'done' && file.isValidExam === false;
  return {
    title: 'Excluir este arquivo?',
    description: isInvalidExam && file.invalidReason
      ? `O sistema interpretou que este arquivo é: "${file.invalidReason}". Tem certeza que deseja excluir?`
      : 'Tem certeza que deseja excluir?',
    countdownSeconds: 0,
  };
}

interface SentExamsViewProps {
  data: SentFilesPageResponse;
  /** null = nenhum cabeçalho clicado; o back devolve a visão agrupada por status. */
  sortBy: string | null;
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
  const [fileToDelete, setFileToDelete] = useState<SentFileResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);
  // Remoção otimista: o back já confirmou (204), mas o router.refresh() ainda vai levar ~2s
  // pra buscar a página nova do servidor. Sem isto, a linha excluída fica visível nesse
  // intervalo e o usuário acha que o clique não funcionou. Guardamos os ids já apagados e
  // filtramos na renderização — quando os dados novos chegam, eles já não trazem esses ids
  // e o filtro vira inofensivo.
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  function pushParams(
    next: Partial<{ page: number; pageSize: number; sortBy: string | null; sortDir: string; q: string }>,
  ) {
    const merged = {
      page: data.page,
      pageSize: data.pageSize,
      sortBy,
      sortDir,
      q: search,
      ...next,
    };

    // Só o que difere do default entra na URL — mantém endereços limpos e compartilháveis.
    // Sem sortBy = ordenação padrão do back: a ausência do parâmetro É o valor.
    const qs = new URLSearchParams();
    if (merged.page > 1) qs.set('page', String(merged.page));
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) qs.set('pageSize', String(merged.pageSize));
    if (merged.sortBy) {
      qs.set('sortBy', merged.sortBy);
      qs.set('sortDir', merged.sortDir);
    }
    if (merged.q) qs.set('q', merged.q);

    const query = qs.toString();
    startNavigation(() => router.push(query ? `/exames-enviados?${query}` : '/exames-enviados'));
  }

  async function confirmDelete() {
    if (!fileToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    setDeletedMessage(null);
    try {
      const res = await fetch(`/api/bloodtests/files/${fileToDelete.fileId}`, { method: 'DELETE' });

      if (res.status !== 204) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setDeleteError(body?.message ?? 'Não foi possível excluir o arquivo. Tente novamente.');
        return;
      }

      // Some com a linha AGORA. O 204 já é a confirmação do back; esperar o router.refresh()
      // só pra tirar a linha da tela faria o usuário encarar por ~2s um arquivo que ele acabou
      // de mandar excluir — que foi exatamente a queixa.
      setDeletedIds((ids) => [...ids, fileToDelete.fileId]);
      setDeletedMessage(`"${fileToDelete.fileName}" foi excluído.`);

      // Excluir o último item de uma página que não é a primeira deixaria o usuário numa página
      // vazia ("Mostrando 21–20 de 20"), sem nada e sem entender por quê — o certo é recuar uma.
      const wasLastItemOfPage = data.items.length === 1 && data.page > 1;
      if (wasLastItemOfPage) {
        pushParams({ page: data.page - 1 });
      } else {
        startRefresh(() => router.refresh());
      }
    } catch {
      setDeleteError('Falha de rede. Verifique sua conexão e tente novamente.');
    } finally {
      setIsDeleting(false);
      // Fecha SEMPRE, inclusive no erro: a mensagem é renderizada ao lado da tabela, e mantendo
      // o diálogo aberto ela ficaria escondida atrás do overlay — o usuário clicaria no "Sim"
      // repetidamente sem nunca ver o motivo da recusa (409 de arquivo em processamento, por
      // exemplo). Fechando, ele lê o aviso e decide se tenta de novo.
      setFileToDelete(null);
    }
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

  // Carregamento rápido não mostra indicador nenhum — ver useDelayedFlag.
  const isGridLoading = useDelayedFlag(isNavigating || isRefreshing);

  // Linhas já excluídas somem da renderização antes mesmo dos dados novos chegarem do servidor.
  const visibleItems = data.items.filter((file) => !deletedIds.includes(file.fileId));
  // Contagens acompanham a remoção otimista pelo mesmo motivo: sem isso o rodapé continuaria
  // dizendo "de 20" com 19 linhas na tela, e o usuário duvidaria do que acabou de ver.
  const pendingDeletions = data.items.length - visibleItems.length;
  const totalCount = Math.max(0, data.totalCount - pendingDeletions);

  const neverSentAnything = totalCount === 0 && !search;
  const rangeStart = (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min((data.page - 1) * data.pageSize + visibleItems.length, totalCount);

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
        <NavBanner
          href="/home"
          icon={CloudUpload}
          title="Tem mais exames pra enviar?"
          description="Envie novos PDFs ou imagens — o processamento começa na hora e você acompanha por aqui."
        />
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

      {/* Fica FORA do ConfirmDialog de propósito: o diálogo fecha ao confirmar, e um erro
          renderizado dentro dele sumiria junto — o usuário veria a linha continuar na lista
          sem nenhuma explicação. Aqui a mensagem sobrevive e fica ao lado da tabela. */}
      {deleteError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
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
      ) : totalCount === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-base font-medium">Nenhum arquivo encontrado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Nenhum arquivo corresponde à busca &ldquo;{search}&rdquo;.
          </p>
        </div>
      ) : (
        <>
          {/* A barra fica no topo da grid em vez de escurecê-la: durante um recarregamento o
              usuário quer justamente LER a lista pra conferir o efeito da ação que tomou, e
              baixar a opacidade deixa ilegível exatamente nesse momento. A lista permanece
              nítida e utilizável; só a barra indica que há sincronização em curso. */}
          <div className="relative overflow-hidden rounded-lg border border-border bg-card">
            {isGridLoading && (
              <>
                {/* Véu SOBRE a tabela, não opacidade NA tabela: opacity-60 no contêiner
                    desbotava o próprio texto e deixava a lista ilegível. Uma camada por cima
                    tinge a superfície mantendo as letras em opacidade cheia — dá o sinal de
                    "recarregando" sem custar legibilidade. pointer-events-none pra tabela
                    continuar rolável enquanto atualiza. */}
                <div className="pointer-events-none absolute inset-0 z-10 bg-foreground/10" aria-hidden="true" />
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary-light"
                  role="status"
                  aria-label="Atualizando a lista"
                >
                  <div className="h-full w-1/4 bg-primary motion-safe:animate-[grid-loading-bar_1.1s_ease-in-out_infinite]" />
                </div>
              </>
            )}
            <div className="overflow-x-auto horizontal-scroll-visible">
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
                  {/* Cabeçalho e ícones CENTRALIZADOS na mesma coluna, em vez de ambos
                      alinhados à direita: alinhar pela borda desencontra os dois, porque cada
                      botão é w-8 (32px) com ícone de 16px no meio, então a borda do grupo fica
                      8px além do último ícone visível. Centralizar os dois resolve sem número
                      mágico e continua correto se um ícone for adicionado ou removido. */}
                  <th className="px-4 py-3 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((file) => {
                  const statusDisplay = getStatusDisplay(file);
                  const isInvalidExam = file.status === 'done' && file.isValidExam === false;
                  const isDuplicateExam = file.status === 'duplicateexam';
                  // Nos dois casos o motivo vem em invalidReason; a moldura da frase muda: o
                  // "não é exame" guarda só a interpretação da IA, o duplicado já vem frase pronta.
                  const statusReason = isInvalidExam
                    ? `O sistema interpretou que este arquivo é: "${file.invalidReason}"`
                    : isDuplicateExam && file.invalidReason
                      ? file.invalidReason
                      : null;

                  return (
                    <tr key={file.fileId} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5" title={file.fileName}>
                        {truncate(file.fileName, FILE_NAME_MAX_LENGTH)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {/* whitespace-nowrap é obrigatório junto com rounded-full: numa coluna
                              estreita (tela pequena, ou "Não é exame de sangue" espremido entre
                              nomes de arquivo longos) o texto quebrava em 4 linhas e o raio de
                              9999px transformava a pílula numa elipse, esticando a linha inteira
                              da tabela. A tabela já tem min-w-[900px] com overflow-x-auto, então
                              o custo de não quebrar é rolagem horizontal — que já é o padrão aqui. */}
                          <span
                            className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${statusDisplay.className}`}
                          >
                            {statusDisplay.label}
                          </span>
                          {statusReason && (
                            <span title={statusReason} className="cursor-help">
                              <Info className="h-3.5 w-3.5 text-amber-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <ExtractedFieldCell file={file} value={file.examDate} format={formatExamDate} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        <ExtractedFieldCell
                          file={file}
                          value={file.requestingDoctor}
                          format={(doctor) =>
                            // Tooltip só quando algo foi de fato escondido — pendurar um tooltip
                            // num nome inteiro visível é ruído, e ainda faria o cursor virar
                            // "help" sem ter ajuda nenhuma a dar.
                            doctor.length > DOCTOR_NAME_MAX_LENGTH ? (
                              <Tooltip content={doctor}>
                                <span className="cursor-help">
                                  {truncate(doctor, DOCTOR_NAME_MAX_LENGTH)}
                                </span>
                              </Tooltip>
                            ) : (
                              doctor
                            )
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {formatDate(file.sentAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {formatDate(file.processedAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
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
                          {UNDELETABLE_STATUSES.has(file.status) ? (
                            <Tooltip content="Não é possível excluir enquanto o exame está sendo processado. Aguarde o processamento terminar.">
                              <button
                                type="button"
                                disabled
                                aria-label="Excluir arquivo"
                                className={cn(
                                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                                  'h-8 w-8 cursor-not-allowed text-destructive',
                                )}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          ) : (
                            <button
                              type="button"
                              title="Excluir arquivo"
                              aria-label="Excluir arquivo"
                              onClick={() => {
                                setDeleteError(null);
                                setFileToDelete(file);
                              }}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive',
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Mostrando {rangeStart}–{rangeEnd} de {totalCount}
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

      {/* Confirmação passageira: some sozinha, não empurra a tabela pra baixo e não exige
          fechar. O sucesso já está evidente na tela (a linha sumiu) — o toast só nomeia o
          arquivo pra tirar a ambiguidade de "sumiu porque apagou ou porque reordenou". */}
      {deletedMessage && <Toast message={deletedMessage} onDismiss={() => setDeletedMessage(null)} />}

      {fileToDelete && (
        <ConfirmDialog
          {...buildDeleteCopy(fileToDelete)}
          icon={<Trash2 className="h-5 w-5 text-destructive" />}
          highlight={
            <div className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-border bg-background px-3 py-2.5">
              <FileText className="h-[18px] w-[18px] shrink-0 text-primary" strokeWidth={1.75} />
              <span className="truncate text-sm" title={fileToDelete.fileName}>
                {fileToDelete.fileName}
              </span>
            </div>
          }
          isLoading={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setFileToDelete(null)}
        />
      )}
    </div>
  );
}
