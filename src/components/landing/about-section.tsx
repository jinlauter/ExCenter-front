import { Building2, Mail } from 'lucide-react';

export function AboutSection() {
  return (
    <section
      id="quem-somos"
      aria-labelledby="about-title"
      className="mx-auto max-w-6xl scroll-mt-48 px-6 py-16 md:py-20"
    >
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary">
            Quem somos
          </p>
          <h2
            id="about-title"
            className="text-balance text-3xl font-semibold tracking-tight md:text-4xl"
          >
            De Curitiba, para uma história de saúde mais organizada.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Somos uma empresa sediada em Curitiba, Paraná, fundada em 2026. Criamos o ExCenter para
            facilitar a organização e o acompanhamento de exames, reunindo informações que costumam
            ficar espalhadas entre laboratórios, portais e arquivos.
          </p>
          <p className="mt-4 text-muted-foreground">
            Nossa missão é tornar esse histórico mais fácil de consultar: conectar resultados de
            diferentes laboratórios, dar visibilidade à evolução ao longo do tempo e ajudar você a
            chegar à consulta com suas informações organizadas.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-primary-light px-3 py-1.5 text-primary">
              Curitiba · PR
            </span>
            <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
              Fundada em 2026
            </span>
          </div>
        </div>
        <aside
          aria-label="Contato e localização"
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <Building2 aria-hidden="true" className="mb-4 h-7 w-7 text-primary" />
          <h3 className="text-xl font-semibold">Vamos conversar</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Dúvidas, sugestões ou interesse em conhecer o projeto? Fale com a gente pelo e-mail.
          </p>
          <a
            href="mailto:jin_lauter@hotmail.com"
            className="mt-5 flex items-start gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-all">jin_lauter@hotmail.com</span>
          </a>
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Endereço e telefone fictícios, por enquanto
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-medium">Endereço de exemplo</dt>
                <dd className="mt-1 text-muted-foreground">
                  Rua Exemplo, 000 · Centro
                  <br />
                  Curitiba — PR
                </dd>
              </div>
              <div>
                <dt className="font-medium">Telefone de exemplo</dt>
                <dd className="mt-1 text-muted-foreground">(41) 0000-0000</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Dados ilustrativos que serão substituídos. Não use este endereço para visitas ou
              correspondências, nem este telefone para contato.
            </p>
          </div>
        </aside>
      </div>
      <p className="mt-10 border-l-2 border-primary pl-4 text-sm text-muted-foreground">
        O ExCenter organiza exames e apresenta seu histórico. A interpretação dos resultados e as
        decisões sobre cuidados de saúde cabem ao profissional que acompanha você.
      </p>
    </section>
  );
}
