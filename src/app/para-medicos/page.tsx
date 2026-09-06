import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, Check, FileText, LockKeyhole, Stethoscope } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { MedicalPilotForm } from '@/components/landing/medical-pilot-form';

export const metadata: Metadata = {
  title: 'Para médicos | ExCenter',
  description:
    'Conheça o piloto em desenvolvimento: exames e histórico organizados para consulta, com acesso autorizado pelo paciente e verificação profissional.',
};

export default function MedicalPilotPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
        >
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Activity aria-hidden="true" className="h-6 w-6 text-primary" />
            ExCenter
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-primary">
              Para pacientes
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-primary">
              Entrar
            </Link>
            <a href="#piloto" className={buttonVariants({ size: 'sm' })}>
              Participar do piloto
            </a>
          </div>
          <div className="flex w-full flex-wrap gap-x-5 gap-y-3 border-t border-border pt-3 text-sm text-muted-foreground">
            <Link href="/#como" className="hover:text-primary">
              Como funciona
            </Link>
            <Link href="/#recursos" className="hover:text-primary">
              Recursos
            </Link>
            <Link href="/#seguranca" className="hover:text-primary">
              Segurança
            </Link>
            <Link href="/#precos" className="hover:text-primary">
              Preços
            </Link>
            <Link href="/#quem-somos" className="hover:text-primary">
              Quem somos
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-2 text-xs font-medium text-primary">
              <Stethoscope aria-hidden="true" className="h-4 w-4" />
              Piloto médico · Em desenvolvimento
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              A evolução dos exames dos seus pacientes,{' '}
              <span className="text-primary">organizada para a consulta.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Estamos preparando um espaço para consultar exames de diferentes laboratórios e
              acompanhar o histórico que cada paciente escolher compartilhar com você.
            </p>
            <a href="#piloto" className={`${buttonVariants({ size: 'lg' })} mt-7`}>
              Quero participar do piloto <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <p className="mt-4 text-sm text-muted-foreground">
              Converse com a gente sobre o piloto. O acesso médico ainda não está disponível.
            </p>
          </div>

          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <figcaption className="border-b border-border bg-muted/60 px-5 py-3 text-xs text-muted-foreground">
              Prévia ilustrativa · Dados fictícios · Recurso em desenvolvimento
            </figcaption>
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-light text-primary">
                  <Stethoscope aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Pacientes que compartilharam comigo</p>
                  <p className="text-xs text-muted-foreground">Visão proposta para o médico</p>
                </div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary-light/40 p-4">
                <p className="font-semibold">Paciente de exemplo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Exame selecionado + histórico autorizado
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Histórico de glicose</h2>
                <span className="text-xs text-muted-foreground">mg/dL</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Mar / 2025', '92', 'Laboratório A'],
                  ['Set / 2025', '95', 'Laboratório B'],
                  ['Mar / 2026', '94', 'Laboratório A'],
                ].map(([date, value, lab]) => (
                  <div key={date} className="rounded-lg bg-muted px-2 py-4">
                    <p className="text-[11px] text-muted-foreground">{date}</p>
                    <p className="my-2 text-2xl font-semibold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{lab}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-3 border-t border-border pt-4 text-sm">
                <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Laudo do exame compartilhado</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Acesso à fonte para conferir os resultados.
                  </p>
                </div>
              </div>
            </div>
          </figure>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
              Como estamos desenhando o acesso
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
              Um convite seu. Uma escolha do paciente.
            </h2>
            <div className="mt-9 grid gap-6 md:grid-cols-3">
              {[
                [
                  '01',
                  'Verificação profissional',
                  'Antes de liberar o acesso, vamos conferir identidade, CRM e UF. Informar um número de CRM não será suficiente.',
                ],
                [
                  '02',
                  'Compartilhamento autorizado',
                  'Você poderá convidar o paciente por link ou QR code. Ele escolherá os exames e, se desejar, o histórico que quer compartilhar.',
                ],
                [
                  '03',
                  'Histórico para a consulta',
                  'O painel reunirá apenas os pacientes e resultados autorizados, em modo de leitura, com acesso ao laudo compartilhado.',
                ],
              ].map(([number, title, description]) => (
                <article key={number} className="rounded-2xl border border-border bg-card p-6">
                  <span className="font-mono text-sm text-primary">{number}</span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <LockKeyhole aria-hidden="true" className="mb-5 h-8 w-8 text-primary" />
            <h2 className="text-3xl font-semibold tracking-tight">
              O paciente decide o alcance do acesso.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Compartilhar um exame, incluir resultados anteriores e autorizar os próximos são
              escolhas diferentes. Estamos construindo o piloto com esse controle desde o início.
            </p>
          </div>
          <ul className="space-y-5">
            {[
              ['Exames selecionados', 'O paciente poderá liberar somente os exames que escolher.'],
              [
                'Histórico opcional',
                'Resultados anteriores poderão ser incluídos, com escopo definido pelo paciente.',
              ],
              [
                'Acompanhamento contínuo, se autorizado',
                'Novos exames adicionados ao ExCenter poderão ser compartilhados com um médico verificado e previamente autorizado.',
              ],
              [
                'Acesso que pode ser encerrado',
                'O paciente poderá interromper novos acessos pelo ExCenter. Arquivos já baixados não podem ser recolhidos pelo sistema.',
              ],
            ].map(([title, description]) => (
              <li key={title} className="flex gap-3">
                <Check aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="piloto" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-20 sm:px-6">
          <div className="grid gap-10 rounded-3xl border border-border bg-card p-6 sm:p-10 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
                Vamos conversar
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Ajude a construir o piloto médico.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Quer usar o ExCenter na sua rotina de consultas? Conte sua área de atuação para
                conversarmos sobre o piloto e as necessidades do seu atendimento.
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                Manifestar interesse não cria uma conta médica nem libera acesso a exames. As
                condições de participação serão combinadas com você.
              </p>
            </div>
            <MedicalPilotForm />
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-7 text-sm text-muted-foreground sm:px-6">
          <Link href="/" className="hover:text-primary">
            ExCenter · Voltar ao início
          </Link>
          <p>Organização de exames. Não diagnostica nem substitui avaliação médica.</p>
        </div>
      </footer>
    </div>
  );
}
