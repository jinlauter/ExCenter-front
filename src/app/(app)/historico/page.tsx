import { backendFetchOrRedirect } from '@/lib/backend';
import { HistoryView } from '@/components/history-view';
import type { BloodTestResultQueryResponse } from '@/types/api';

export default async function HistoryPage() {
  const results = await backendFetchOrRedirect<BloodTestResultQueryResponse[]>('/api/bloodtests/results/query', {
    method: 'POST',
    body: {},
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-medium">Histórico de exames</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualize a evolução dos seus parâmetros ao longo do tempo.
        </p>
      </header>

      {results.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-base font-medium">Nenhum exame processado ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Assim que um exame de sangue for enviado e processado, seus resultados aparecem aqui.
          </p>
        </div>
      ) : (
        <HistoryView results={results} />
      )}
    </div>
  );
}
