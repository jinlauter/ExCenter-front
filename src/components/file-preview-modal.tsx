/* eslint-disable @next/next/no-img-element -- imagem vem de rota BFF privada autenticada */
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

// Laudos costumam ser documentos longos (várias páginas) ou imagens em alta resolução —
// por isso o modal é quase tela cheia (92vh x 96vw) em vez de um popup pequeno.
function isImageFile(fileName: string) {
  return /\.(jpe?g|png)$/i.test(fileName);
}

export function FilePreviewModal({
  fileId,
  fileName,
  onClose,
}: {
  fileId: string;
  fileName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const src = `/api/bloodtests/files/${fileId}/download?inline=true`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizando ${fileName}`}
    >
      <div
        className="flex h-[92vh] w-[96vw] max-w-6xl flex-col rounded-lg bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="truncate pr-4 text-sm font-medium" title={fileName}>
            {fileName}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-muted/30">
          {isImageFile(fileName) ? (
            <img src={src} alt={fileName} className="mx-auto max-w-full" />
          ) : (
            <iframe src={src} title={fileName} className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
