import { ChevronDown, Eye, FileText, LineChart, Search, SlidersHorizontal } from 'lucide-react';
import { MockupFrame } from './mockup-frame';

// Prévia da tela do médico: a lista de exames que os pacientes compartilharam com ele. É a
// única tela da conta médica que a landing precisa mostrar — o resto do produto (envio,
// normalização, histórico) já é o app do paciente.
//
// Recurso EM DESENVOLVIMENTO: a legenda do quadro diz isso, e é por isso que este mockup é o
// único dos quatro que não replica uma tela existente. O que ele promete tem que ser só o que
// está desenhado: busca por nome/CPF/nascimento/período, uma linha por exame de paciente, e as
// duas leituras de cada exame (o laudo ExCenter enriquecido e o original do laboratório).

// Dois tipos de filtro, com formas diferentes de propósito: os de BUSCA o médico digita (ele
// chega com o nome ou o CPF na mão), os de SELEÇÃO ele escolhe de uma lista fechada.
const SEARCH_FILTERS = ['Nome do paciente', 'CPF', 'Data de nascimento'];
const SELECT_FILTERS = ['Sexo: todos', 'Laboratório: todos'];

const EXAMS = [
  {
    patient: 'Marina Alves',
    birth: '12/04/1988',
    date: '20/05/2025',
    lab: 'Frischmann Aisengart',
    scope: 'Com histórico',
    until: 'até 19/08/2025',
    withHistory: true,
    seen: false,
  },
  {
    patient: 'Carlos Menezes',
    birth: '03/11/1962',
    date: '18/05/2025',
    lab: 'Unimed',
    scope: 'Só este exame',
    until: 'até 17/06/2025',
    withHistory: false,
    seen: false,
  },
  {
    patient: 'Joana Ribeiro',
    birth: '27/07/1979',
    date: '12/05/2025',
    lab: 'Fleury',
    scope: 'Com histórico',
    until: 'até 10/11/2025',
    withHistory: true,
    seen: true,
  },
];

const COLUMNS = ['Paciente', 'Nascimento', 'Data do exame', 'Laboratório', 'Compartilhamento'];

export function DoctorExamsMockup() {
  return (
    <MockupFrame
      url="excenter.com.br/medico/exames"
      caption="Prévia ilustrativa da tela do médico · recurso em desenvolvimento · dados fictícios"
    >
      <div className="bg-background p-4 sm:p-5">
        <div className="text-[15px] font-semibold">Exames compartilhados comigo</div>
        <div className="text-[11px] text-muted-foreground">
          Cada linha é um exame que um paciente autorizou você a ver.
        </div>

        {/* A busca é o que faz a tela funcionar num consultório cheio: o médico chega com o
            nome ou o CPF na mão, não com a data do exame. O período já vem nos últimos 30
            dias porque a pergunta do dia a dia é "o que chegou desde a última consulta". */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SEARCH_FILTERS.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-[10.5px] text-muted-foreground"
            >
              <Search className="h-3 w-3 shrink-0" />
              {f}
            </span>
          ))}
          {SELECT_FILTERS.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-muted px-2.5 py-1.5 text-[10.5px] text-muted-foreground"
            >
              {f}
              <ChevronDown className="h-3 w-3 shrink-0" />
            </span>
          ))}
          {/* O período é o único que já vem preenchido — daí o destaque em verde: a tela abre
              respondendo "o que chegou desde a última consulta", não com a lista inteira. */}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary-light px-2.5 py-1.5 text-[10.5px] font-medium text-primary">
            Período: últimos 30 dias
            <ChevronDown className="h-3 w-3 shrink-0" />
          </span>
          {/* Porta para o resto dos filtros, fechada. A tela precisa caber num relance, mas
              esconder que existe mais faria a busca parecer mais pobre do que é. */}
          <span className="inline-flex items-center gap-1.5 px-1 text-[10.5px] font-medium text-primary underline underline-offset-2">
            <SlidersHorizontal className="h-3 w-3 shrink-0" />
            Busca avançada
            <ChevronDown className="h-3 w-3 shrink-0" />
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium">{c}</th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {EXAMS.map((exam) => (
                  <tr key={exam.patient} className="border-b border-border last:border-0">
                    {/* Não visualizado = bolinha cheia + nome em negrito, a convenção que todo
                        mundo já leu em caixa de entrada. Visualizado fica com o olho apagado:
                        o estado "já vi" não deve competir por atenção com o que chegou agora. */}
                    <td className={`whitespace-nowrap px-3 py-2 ${exam.seen ? 'font-medium' : 'font-bold'}`}>
                      <span className="inline-flex items-center gap-2">
                        {exam.seen ? (
                          <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                        {exam.patient}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{exam.birth}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{exam.date}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{exam.lab}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          exam.withHistory
                            ? 'border-primary-light bg-primary-light text-primary'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        {exam.scope}
                      </span>
                      <span className="ml-1.5 text-[10px] text-muted-foreground">{exam.until}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary-light text-primary">
                          <LineChart className="h-3.5 w-3.5" />
                        </span>
                        <span className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sem a legenda os dois ícones da última coluna são adivinhação — e a diferença entre
            eles é justamente o que a seção inteira está vendendo. */}
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Ainda não visualizado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3 w-3" /> Já visualizado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LineChart className="h-3 w-3 text-primary" /> Laudo ExCenter, com o histórico do paciente
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Laudo original, como o laboratório emitiu
          </span>
        </div>
      </div>
    </MockupFrame>
  );
}
