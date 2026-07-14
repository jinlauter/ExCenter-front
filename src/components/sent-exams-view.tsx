'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Download, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
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

export function SentExamsView({ files }: { files: SentFileResponse[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, startRefresh] = useTransition();

  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

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
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
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
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(file.sentAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(file.processedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <a
                        href={`/api/bloodtests/files/${file.fileId}/download`}
                        download={file.fileName}
                        title="Baixar arquivo original"
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 text-primary')}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
