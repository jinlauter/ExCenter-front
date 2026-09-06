import { Eye, LineChart } from 'lucide-react';
import { MockupFrame } from './mockup-frame';
import { AppSidebarMockup } from './app-sidebar-mockup';

// Réplica da tela "Resultado de exames" (src/app/(app)/resultados) — a prova de que o histórico
// realmente cruza laboratórios: as linhas mostram labs diferentes convivendo na mesma lista,
// que é a tese da landing inteira em forma de tabela.
//
// Mantém as MESMAS seis colunas da tela real (data, médico, laboratório, exames incluídos,
// alterados, ações). Esconder colunas deixaria o print mais leve às custas de prometer uma
// tela que não existe. A tabela rola dentro do próprio quadro no celular, como no app.

const EXAMS = [
  {
    date: '20/05/2025',
    doctor: 'Dr. Bruno Lima',
    lab: 'Frischmann Aisengart',
    included: 'Hemograma, Glicose, Perfil lipídico...',
    abnormal: 2,
  },
  {
    date: '12/12/2024',
    doctor: 'Dr. Bruno Lima',
    lab: 'Frischmann Aisengart',
    included: 'Glicose, TSH, Vitamina D',
    abnormal: 1,
  },
  {
    date: '02/07/2024',
    doctor: 'Dra. Helena Sato',
    lab: 'Unimed',
    included: 'Hemograma, Ferritina',
    abnormal: 0,
  },
  {
    date: '14/03/2024',
    doctor: 'Dra. Helena Sato',
    lab: 'Fleury',
    included: 'Perfil lipídico, Glicose, TGO...',
    abnormal: 3,
  },
];

const COLUMNS = ['Data do exame', 'Médico solicitante', 'Laboratório', 'Exames incluídos', 'Alterados'];

function AbnormalBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
        Sem alterações
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      {count} {count === 1 ? 'alterado' : 'alterados'}
    </span>
  );
}

export function ExamListMockup() {
  return (
    <MockupFrame
      url="excenter.com.br/resultados"
      caption="A lista de exames no ExCenter · dados ilustrativos"
    >
      <div className="flex bg-background">
        <AppSidebarMockup active="Resultado de exames" />

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="text-[15px] font-semibold">Resultado de exames</div>
          <div className="text-[11px] text-muted-foreground">
            Veja o resultado de cada exame que você enviou, do jeito que o médico pediu.
          </div>

          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
            <LineChart className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.75} />
            <div>
              <div className="text-[11.5px] font-medium leading-tight">Visualizar histórico geral</div>
              <div className="text-[10.5px] leading-snug text-muted-foreground">
                A evolução dos seus parâmetros ao longo do tempo, cruzando todos os exames enviados.
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    {COLUMNS.map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium">{c}</th>
                    ))}
                    <th className="px-3 py-2 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMS.map((exam) => (
                    <tr key={exam.date} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{exam.date}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{exam.doctor}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{exam.lab}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{exam.included}</td>
                      <td className="px-3 py-2"><AbnormalBadge count={exam.abnormal} /></td>
                      <td className="px-3 py-2">
                        <span className="mx-auto grid h-6 w-6 place-items-center rounded-md text-primary">
                          <Eye className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-2.5 text-[10.5px] text-muted-foreground">Mostrando 1–4 de 12</div>
        </div>
      </div>
    </MockupFrame>
  );
}
