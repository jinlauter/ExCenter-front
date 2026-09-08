import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, LockKeyhole, Stethoscope } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { buttonVariants } from '@/components/ui/button';
import { MedicalPilotForm } from '@/components/landing/medical-pilot-form';
import { DoctorExamsMockup } from '@/components/landing/doctor-exams-mockup';

export const metadata: Metadata = {
  // Só o nome da página: o sufixo "| ExCenter" vem do template em app/layout.tsx. Repetir a
  // marca aqui gerava "Para médicos | ExCenter | ExCenter" na aba.
  title: 'Para médicos',
  alternates: { canonical: '/para-medicos' },
  description:
    'Conheça o piloto em desenvolvimento: a lista dos exames que seus pacientes compartilharam com você, com busca por nome, CPF, nascimento e período — e cada exame no laudo ExCenter ou no original do laboratório.',
};

export default function MedicalPilotPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
        >
          {/* Sem os atalhos de seção da landing: "Como funciona", "Recursos", "Preços" e
              "Quem somos" falam todos do produto do PACIENTE — daqui, cada um era só um jeito
              disfarçado de voltar pra home. Um "Voltar ao início" diz a mesma coisa sem
              fingir que são cinco destinos. A marca também leva pra home, como em toda parte. */}
          {/* Sem a assinatura aqui: esta página é sobre o produto do MÉDICO, e "Seus exames,
              um histórico" fala com o paciente. A marca é a mesma, a promessa não. */}
          <Link href="/" className="hover:text-primary">
            <BrandLogo size="md" />
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              ← Voltar ao início
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-primary">
              Entrar
            </Link>
            <a href="#piloto" className={buttonVariants({ size: 'sm' })}>
              Participar do piloto
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-2 text-xs font-medium text-primary">
              <Stethoscope aria-hidden="true" className="h-4 w-4" />
              Piloto médico · Em desenvolvimento
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              A evolução dos exames dos seus pacientes,{' '}
              <span className="text-primary">de fácil acesso e organizada.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Uma conta de médico com uma tela só: a lista dos exames que seus pacientes
              compartilharam com você. Filtre por nome, CPF, nascimento, sexo, laboratório ou
              período, e abra cada exame do jeito que precisar — com o histórico do paciente ou
              como o laboratório emitiu.
            </p>
            <a href="#piloto" className={`${buttonVariants({ size: 'lg' })} mt-7`}>
              Quero participar do piloto <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <p className="mt-4 text-sm text-muted-foreground">
              Converse com a gente sobre o piloto. O acesso médico ainda não está disponível.
            </p>
          </div>

          {/* A tela larga não cabe numa coluna de hero: a lista tem seis colunas e a barra de
              busca é parte do argumento, não decoração. Por isso o hero vira centralizado e o
              print ocupa a largura inteira embaixo. */}
          <div className="mt-12">
            <DoctorExamsMockup />
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
              Como estamos desenhando o acesso
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
              Uma lista, duas leituras de cada exame.
            </h2>
            <div className="mt-9 grid gap-6 md:grid-cols-3">
              {[
                [
                  '01',
                  'Verificação profissional',
                  'Antes de liberar a conta, vamos conferir identidade, CRM e UF. Informar um número de CRM não será suficiente.',
                ],
                [
                  '02',
                  'Uma linha por exame de paciente',
                  'A lista reunirá tudo que foi autorizado, com busca por nome, CPF, data de nascimento, sexo, laboratório e período — que já abre nos últimos 30 dias, a pergunta do dia a dia.',
                ],
                [
                  '03',
                  'O laudo ExCenter ou o original',
                  'Em cada linha, duas ações: o laudo enriquecido com o histórico do paciente — datado de quando foi gerado — ou o arquivo original que ele enviou, como o laboratório emitiu.',
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
              O paciente decide o alcance — e o prazo.
            </h2>
            <p className="mt-4 text-muted-foreground">
              O que compartilhar, quanto do histórico junto e por quanto tempo são três escolhas
              separadas, todas do paciente. É o que a LGPD exige de um dado de saúde, e é como
              estamos construindo o piloto desde o início.
            </p>
          </div>
          <ul className="space-y-5">
            {[
              [
                'Só o exame, ou o exame com o histórico',
                'Ao compartilhar, o paciente escolhe entre liberar apenas os resultados daquele laudo ou incluir a evolução de cada marcador nos exames anteriores.',
              ],
              [
                'Prazo definido pelo paciente',
                'Cada compartilhamento tem uma validade escolhida por ele. Vencido o prazo, o exame sai da sua lista — sem você precisar fazer nada, e sem ele precisar lembrar de revogar.',
              ],
              [
                'Autorização automática, se ele quiser',
                'O paciente poderá ligar o compartilhamento automático com um médico já autorizado: os próximos exames que ele enviar entram na sua lista sozinhos, no escopo que ele definiu.',
              ],
              [
                'Acesso que pode ser encerrado antes',
                'O paciente pode cortar o acesso a qualquer momento, sem esperar o prazo. Arquivos já baixados, porém, não podem ser recolhidos pelo sistema.',
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
