import { FileText, LineChart } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { UploadCard } from '@/components/upload-card';

// Home — server component. Pega o nome da sessão para a saudação.
export default async function HomePage() {
  const session = await getSession();
  const username = session.username ?? 'usuário';

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-muted-foreground">Olá, {username}</p>
        <h1 className="mt-1 text-2xl font-medium">Pronto para acompanhar sua saúde?</h1>
      </header>

      <UploadCard />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/exames-enviados"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary-lighter"
        >
          <div className="mb-1 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <span className="text-sm font-medium">Exames enviados</span>
          </div>
          {/* TODO: substituir pelo número real de exames. Back não tem
              endpoint dedicado de contagem hoje. Avaliar GET /api/bloodtests/count. */}
          <p className="text-xs text-muted-foreground">
            Acompanhe o processamento dos seus envios
          </p>
        </Link>

        <Link
          href="/historico"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary-lighter"
        >
          <div className="mb-1 flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <span className="text-sm font-medium">Histórico</span>
          </div>
          <p className="text-xs text-muted-foreground">Veja seus gráficos ao longo do tempo</p>
        </Link>
      </div>
    </div>
  );
}
