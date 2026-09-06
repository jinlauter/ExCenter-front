import { CloudUpload, FileText, LineChart } from 'lucide-react';
import { MockupFrame } from './mockup-frame';
import { AppSidebarMockup } from './app-sidebar-mockup';

// Réplica da home do app (src/app/(app)/home) para a landing mostrar a tela real sem publicar
// um PNG com dado de saúde de alguém. Feita em markup (e não screenshot) para acompanhar os
// tokens do tema, escalar em qualquer tela e nunca ficar borrada — o mesmo caminho já usado
// pelo showcard do hero.
//
// Espelha o que a home renderiza hoje: saudação, resumo de arquivos enviados com a quebra por
// status, o cartão de upload e os dois atalhos.

const STATUS_BADGES = [
  { count: 2, label: 'Processando', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { count: 1, label: 'Duplicado', className: 'border-border bg-muted text-muted-foreground' },
  { count: 11, label: 'Concluído', className: 'border-primary-light bg-primary-light text-primary' },
];

const SHORTCUTS = [
  { Icon: FileText, title: 'Exames enviados', sub: 'Acompanhe o processamento dos seus envios' },
  { Icon: LineChart, title: 'Resultado de exames', sub: 'Veja o resultado de cada exame processado' },
];

export function AppHomeMockup() {
  return (
    <MockupFrame url="excenter.com.br/home" caption="A home do ExCenter · dados ilustrativos">
      <div className="flex bg-background">
        <AppSidebarMockup active="Início" />

        <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
          <div>
            <div className="text-[15px] font-semibold">Bom dia, Marina</div>
            <div className="text-[11px] text-muted-foreground">Pronta para acompanhar sua saúde?</div>
          </div>

          {/* Resumo dos arquivos enviados + quebra por status, como no SentFilesSummaryCard. */}
          <div className="rounded-lg border border-border bg-card p-3.5">
            <div className="flex items-center gap-3">
              <FileText className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.75} />
              <div>
                <div className="text-[19px] font-semibold leading-none">14</div>
                <div className="text-[11px] text-muted-foreground">Arquivos enviados</div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border pt-2.5">
              {STATUS_BADGES.map(({ count, label, className }) => (
                <span
                  key={label}
                  className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${className}`}
                >
                  {count} {label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-primary-lighter bg-primary-light/40 px-4 py-5 text-center">
            <CloudUpload className="mx-auto h-6 w-6 text-primary" strokeWidth={1.75} />
            <div className="mt-1.5 text-[12.5px] font-medium">Arraste os PDFs dos seus laudos</div>
            <div className="text-[11px] text-muted-foreground">de qualquer laboratório · vários de uma vez</div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {SHORTCUTS.map(({ Icon, title, sub }) => (
              <div key={title} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <Icon className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <div className="text-[11.5px] font-medium leading-tight">{title}</div>
                    <div className="text-[10.5px] leading-snug text-muted-foreground">{sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}
