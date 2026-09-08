import { AlertTriangle, Activity, Check, Copy, FileLineChart, Share2 } from 'lucide-react';
import { MockupFrame } from './mockup-frame';

// Prévia do compartilhamento: a tela do exame ao fundo, esmaecida, com o diálogo de link aberto
// por cima — o instante exato em que o usuário decide o prazo e copia o endereço.
//
// É desenho estático, não o componente real (ShareExamDialog), e de propósito: aquele é client
// component com fetch, estado e área de transferência; arrastá-lo pra landing traria um diálogo
// que tenta falar com a API numa página pública. O que precisa ser fiel é o VISUAL — o aviso
// âmbar, os quatro prazos com "4 dias" marcado e o campo com o botão copiar —, e é o que está
// replicado aqui. Se o diálogo mudar de cara, este arquivo precisa acompanhar.
//
// A URL do print é fictícia e o token é claramente falso ("kZ9x…"): ninguém deve conseguir
// digitar o que vê aqui e chegar em exame de alguém.

const LINHAS = [
  { nome: 'Colesterol total', ref: 'Referência: até 190 mg/dL', valor: '190 mg/dL' },
  { nome: 'HDL', ref: 'Referência: acima de 40 mg/dL', valor: '54 mg/dL' },
  { nome: 'Triglicerídeos', ref: 'Referência: até 150 mg/dL', valor: '148 mg/dL' },
  { nome: 'Glicose em jejum', ref: 'Referência: 70 a 99 mg/dL', valor: '92 mg/dL' },
];

const PRAZOS = ['24 horas', '4 dias', '15 dias', '30 dias'];

export function ShareMockup() {
  return (
    <MockupFrame
      url="excenter.tec.br/resultados"
      caption="Exemplo ilustrativo · dados fictícios"
    >
      <div className="relative">
        {/* Fundo: a página do exame como ela é. aria-hidden porque é cenário — quem usa leitor
            de tela deve ouvir o diálogo, que é o assunto do print. */}
        <div className="p-5 blur-[1.5px]" aria-hidden="true">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-medium">Resultado do exame</p>
            <div className="flex gap-1 text-primary">
              <span className="grid h-7 w-7 place-items-center rounded-md">
                <FileLineChart className="h-3.5 w-3.5" />
              </span>
              {/* O ícone de compartilhar em destaque: é o que a seção está explicando. */}
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-light">
                <Share2 className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1.5 rounded-xl border border-border p-3 text-[11px]">
            <div>
              <p className="uppercase tracking-wide text-muted-foreground">Paciente</p>
              <p className="font-medium">Maria A. de Souza</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-muted-foreground">Data do exame</p>
              <p className="font-medium">20 de janeiro de 2026</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-muted-foreground">Laboratório</p>
              <p className="font-medium">Frischmann Aisengart</p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="mb-1.5 text-[11px] font-semibold">PERFIL LIPÍDICO</p>
            {LINHAS.map((linha) => (
              <div
                key={linha.nome}
                className="flex items-center justify-between gap-3 border-t border-border py-1.5 first:border-t-0 text-[11px]"
              >
                <div>
                  <p className="font-medium">{linha.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{linha.ref}</p>
                </div>
                <span className="font-semibold">{linha.valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Véu + diálogo, como o modal real aparece por cima da página. */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[300px] rounded-xl bg-card p-3.5 shadow-2xl">
            <p className="mb-2.5 text-[13px] font-medium">Compartilhar este exame</p>

            <div className="mb-2.5 flex gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[9.5px] leading-snug text-amber-900">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
              <p>
                <strong>Qualquer pessoa com o link vê este exame</strong>, sem precisar de conta.
                Ele para de funcionar sozinho na data que você escolher.
              </p>
            </div>

            <p className="mb-1.5 text-[10px] font-medium">O link fica de pé por</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {PRAZOS.map((prazo) => (
                <span
                  key={prazo}
                  className={
                    prazo === '4 dias'
                      ? 'rounded-md border border-primary bg-primary px-2 py-1 text-[9.5px] text-primary-foreground'
                      : 'rounded-md border border-border px-2 py-1 text-[9.5px] text-muted-foreground'
                  }
                >
                  {prazo}
                </span>
              ))}
            </div>

            <div className="flex gap-1.5">
              <span className="min-w-0 flex-1 truncate rounded-md border border-input bg-muted/40 px-2 py-1.5 font-mono text-[9px] text-muted-foreground">
                excenter.tec.br/resultados-compartilhados/kZ9x…
              </span>
              <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[9.5px] font-medium">
                <Copy className="h-3 w-3" aria-hidden="true" />
                Copiar
              </span>
            </div>

            <p className="mt-2 flex items-center gap-1 text-[9.5px] text-primary">
              <Check className="h-3 w-3" aria-hidden="true" />
              Expira em 12 de janeiro · pode revogar antes
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé do print: o que o destinatário recebe. Fecha a história — o valor não é "gerei
          um link", é "a outra pessoa abriu e entendeu". */}
      <div className="flex items-center gap-2 border-t border-border bg-primary-light/40 px-4 py-2 text-[10.5px] text-primary">
        <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Quem recebe abre no navegador — com a evolução de cada marcador e o laudo original do
          laboratório. Sem instalar nada, sem criar conta.
        </span>
      </div>
    </MockupFrame>
  );
}
