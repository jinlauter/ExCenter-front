import { FileText, LineChart } from 'lucide-react';
import Link from 'next/link';
import { backendFetchOrRedirect } from '@/lib/backend';
import { UploadCard } from '@/components/upload-card';
import { HomeGreeting } from '@/components/home-greeting';
import { SentFilesSummaryCard } from '@/components/sent-files-summary-card';
import type { SentFilesSummaryResponse, UserProfileResponse } from '@/types/api';

// Home — server component. Busca o perfil (nome atualizado + sexo biológico, que flexiona a
// saudação) e o resumo dos arquivos enviados pro card. O resumo é agregado no banco (GROUP BY):
// antes isso era um GET da listagem com pageSize=1 só pelo totalCount, que não dava a quebra
// por status e ainda assim montava a query de paginação inteira.
export default async function HomePage() {
  const [profile, summary] = await Promise.all([
    backendFetchOrRedirect<UserProfileResponse>('/api/users/me'),
    backendFetchOrRedirect<SentFilesSummaryResponse>('/api/bloodtests/files/summary'),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <HomeGreeting username={profile.username} biologicalSex={profile.biologicalSex} />
        <p className="mt-0.5 text-sm text-muted-foreground">
          {profile.biologicalSex?.toLowerCase() === 'feminino'
            ? 'Pronta para acompanhar sua saúde?'
            : 'Pronto para acompanhar sua saúde?'}
        </p>
      </header>

      <SentFilesSummaryCard summary={summary} />

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
          href="/resultados"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary-lighter"
        >
          <div className="flex items-start gap-2">
            <LineChart className="h-[38px] w-[38px] shrink-0 text-primary" strokeWidth={1.75} />
            <div>
              <p className="text-[13px] font-medium leading-tight">Resultado de exames</p>
              <p className="text-xs text-muted-foreground">Veja o resultado de cada exame processado</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
