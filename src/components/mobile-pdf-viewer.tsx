'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// O worker precisa ser servido do mesmo domínio — nossa CSP não permite script-src externo.
// new URL(..., import.meta.url) pareceria mais simples (deixa o bundler empacotar o worker
// automaticamente), mas quebra o build: o Terser (etapa de minificação do Next) não sabe lidar
// com "import.meta" dentro do .mjs do worker. Por isso o arquivo é copiado pra public/ via
// scripts/copy-pdf-worker.mjs (postinstall/prebuild) e servido como asset estático simples,
// fora do pipeline de bundling/minificação.
//
// Importa GlobalWorkerOptions direto de pdfjs-dist (não via re-export do react-pdf) — pelo
// re-export, o objeto chegava sem GlobalWorkerOptions num contexto que fazia o
// Object.defineProperty quebrar com "called on non-object".
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Renderiza o PDF via canvas (motor do próprio Firefox) em vez de depender do visualizador
// nativo do navegador — Chrome/Safari mobile não suportam PDF embutido em <iframe>. Todas as
// páginas ficam empilhadas com rolagem contínua, como a maioria dos leitores de PDF mobile.
export function MobilePdfViewer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState<number>();

  useEffect(() => {
    function updateWidth() {
      setPageWidth(containerRef.current?.clientWidth);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div ref={containerRef} className="mx-auto max-w-full">
      <Document
        file={src}
        onLoadSuccess={({ numPages: total }) => setNumPages(total)}
        loading={<p className="p-6 text-center text-sm text-muted-foreground">Carregando PDF…</p>}
        error={<p className="p-6 text-center text-sm text-destructive">Não foi possível carregar o PDF.</p>}
      >
        {Array.from({ length: numPages ?? 0 }, (_, i) => (
          <Page key={i} pageNumber={i + 1} width={pageWidth} className="mb-2" />
        ))}
      </Document>
    </div>
  );
}
