import { FileText, LineChart } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { backendFetch } from '@/lib/backend';
import { UploadCard } from '@/components/upload-card';
import { HomeGreeting } from '@/components/home-greeting';
import type { SentFileResponse } from '@/types/api';

// Home — server component. Pega o nome da sessão para a saudação e a
// contagem de exames enviados pro card de resumo.
export default async function HomePage() {
  const session = await getSession();
  const username = session.username ?? 'usuário';
  const files = await backendFetch<SentFileResponse[]>('/api/bloodtests/files');

  return (
    <div className="space-y-4">
      <header>
        <HomeGreeting username={username} />
        <p className="mt-0.5 text-sm text-muted-foreground">Pronto para acompanhar sua saúde?</p>
      </header>

      <div className="mb-2 inline-flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <FileText className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.75} />
        <div>
          <p className="text-[22px] font-semibold leading-none">{files.length}</p>
          <p className="text-xs text-muted-foreground">Exames enviados</p>
        </div>
      </div>

      <UploadCard />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/exames-enviados"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary-lighter"
        >
          <div className="flex items-start gap-2">
            <FileText className="h-[38px] w-[38px] shrink-0 text-primary" strokeWidth={1.75} />
            <div>
              <p className="text-[13px] font-medium leading-tight">Exames enviados</p>
              <p className="text-xs text-muted-foreground">Acompanhe o processamento dos seus envios</p>
            </div>
          </div>
        </Link>

        <Link
          href="/historico"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary-lighter"
        >
          <div className="flex items-start gap-2">
            <LineChart className="h-[38px] w-[38px] shrink-0 text-primary" strokeWidth={1.75} />
            <div>
              <p className="text-[13px] font-medium leading-tight">Histórico</p>
              <p className="text-xs text-muted-foreground">Veja seus gráficos ao longo do tempo</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
