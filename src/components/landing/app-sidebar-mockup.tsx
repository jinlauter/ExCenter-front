import { FileText, Home, LineChart, Settings } from 'lucide-react';

// O menu lateral do app, compartilhado pelos prints da landing: as duas telas mostradas vivem
// dentro do mesmo shell, e duplicar a barra em cada mockup deixaria as duas divergirem.
// Abaixo de sm fica só com os ícones, para o print não espremer o conteúdo que importa.

const ITEMS = [
  { label: 'Início', Icon: Home },
  { label: 'Exames enviados', Icon: FileText },
  { label: 'Resultado de exames', Icon: LineChart },
  { label: 'Configurações', Icon: Settings },
];

export function AppSidebarMockup({ active }: { active: string }) {
  return (
    <nav aria-hidden className="w-12 shrink-0 border-r border-border bg-card py-3 sm:w-44">
      <div className="mb-3 flex items-center gap-2 px-2.5 sm:px-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-light">
          <LineChart className="h-3.5 w-3.5 text-primary" />
        </span>
        <span className="hidden text-[13px] font-semibold sm:inline">ExCenter</span>
      </div>
      <ul className="space-y-0.5 px-1.5 sm:px-2">
        {ITEMS.map(({ label, Icon }) => (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] ${
              label === active ? 'bg-primary-light font-medium text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden truncate sm:inline">{label}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
