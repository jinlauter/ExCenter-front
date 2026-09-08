'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  Check,
  FileText,
  LineChart,
  Target,
  Building2,
  Share2,
  Dna,
  Lock,
  ShieldCheck,
  Ban,
  Trash2,
  Minus,
  Plus,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckoutModal, type CheckoutPlan } from './checkout-modal';
import { AboutSection } from './about-section';
import { BrandLogo } from '@/components/brand-logo';
import { LANDING_FAQ } from './landing-faq';
import { AppHomeMockup } from './app-home-mockup';
import { ExamListMockup } from './exam-list-mockup';
import { LaudoMockup } from './laudo-mockup';
import { ShareMockup } from './share-mockup';

// Landing pública (rota /). CTA abre um checkout SIMULADO — o fluxo real (waitlist/cadastro/
// pagamento) está no BACKLOG do back, ainda a decidir. Copy revisada com o dono: sem mencionar
// LOINC/IA nem detalhes técnicos de segurança; tese central = reunir exames de todos os labs.

type PlanKey = 'Grátis' | 'Pessoal' | 'Ilimitado' | 'Clínica' | 'Casa de Apoio';

// A unidade cobrada é o ENVIO de laudo, não o "exame": um PDF pode trazer dezenas de
// parâmetros, e cobrar por parâmetro puniria justamente quem manda o laudo completo.
//
// Os planos de equipe derivam do Ilimitado (R$ 39): Clínica com 5 contas ilimitadas a ~24% de
// desconto sobre 5 avulsas, Casa de Apoio com 10 a ~28% — o desconto cresce com o compromisso.
// Cada um vem ainda com METADE do total em contas Pessoal (arredondado pra cima na Clínica,
// que dá 2,5), para quem acompanha pouco não ocupar uma conta ilimitada. O terceiro degrau
// (Instituição) não tem preço: é conversa, não checkout.
const PLANS: Record<PlanKey, { desc: string; monthly: string; annual: string }> = {
  Grátis: {
    desc: 'Comece sem cartão — 3 envios de exames e histórico de 90 dias.',
    monthly: 'R$ 0',
    annual: 'R$ 0',
  },
  Pessoal: {
    desc: 'Até 20 envios de exames por mês e histórico completo.',
    monthly: 'R$ 19',
    annual: 'R$ 16',
  },
  Ilimitado: {
    desc: 'Envios de exames ilimitados — importe anos de uma vez.',
    monthly: 'R$ 39',
    annual: 'R$ 32',
  },
  Clínica: {
    desc: '5 contas ilimitadas + 3 contas Pessoal, pagamento centralizado.',
    monthly: 'R$ 149',
    annual: 'R$ 124',
  },
  'Casa de Apoio': {
    desc: '10 contas ilimitadas + 5 contas Pessoal, pagamento centralizado.',
    monthly: 'R$ 279',
    annual: 'R$ 232',
  },
};

const TEAM_CONTACT_EMAIL = 'jin_lauter@hotmail.com';

export function Landing() {
  const [annual, setAnnual] = useState(false);
  // "Para você" × "Para equipes": mesmo padrão visual do pill Mensal/Anual, que a página já
  // ensina. Equipes = personal, médico, casa de repouso — convida N pessoas, cada uma com a
  // PRÓPRIA conta (privada como qualquer outra), e o pagamento fica com quem contratou.
  const [forTeams, setForTeams] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutPlan | null>(null);

  function openCheckout(name: PlanKey) {
    const p = PLANS[name];
    setCheckout({
      name,
      desc: p.desc,
      priceLabel: (annual ? p.annual : p.monthly) + (annual && name !== 'Grátis' ? '/mês' : ''),
      cycleLabel: annual ? 'anual' : 'mensal',
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground [&_section[id]]:scroll-mt-48">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        {/* No celular, marca centralizada acima das ações; todas as seções continuam acessíveis. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:gap-x-4 sm:px-6">
          {/* Assinatura escondida no celular: este cabeçalho é FIXO, e medido no viewport de
              375px ela o levava de 146px para 216px — 27% da tela ocupados o tempo todo. No
              rodapé, que não gruda, ela aparece em qualquer largura. */}
          <BrandLogo
            size="md"
            withTagline
            taglineClassName="max-sm:hidden"
            className="w-full justify-center sm:w-auto sm:justify-start"
          />
          <nav
            aria-label="Seções da página"
            className="order-last flex w-full flex-wrap justify-center gap-1 border-t border-border/50 pt-2 lg:order-none lg:w-auto lg:flex-1 lg:border-0 lg:pt-0 max-sm:[&_a]:px-2 max-sm:[&_a]:text-xs"
          >
            <a
              href="#como"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Como funciona
            </a>
            <a
              href="#recursos"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Recursos
            </a>
            <a
              href="#seguranca"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Segurança
            </a>
            <a
              href="#precos"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Preços
            </a>
            <a
              href="#quem-somos"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Quem somos
            </a>
          </nav>
          <div className="ml-auto flex w-full items-center justify-center gap-1 sm:w-auto sm:justify-end sm:gap-2">
            {/* Visível SEMPRE, inclusive no celular: escondido abaixo de sm, quem já tem conta e
                caía na landing pelo telefone ficava sem porta de entrada — só via "Começar grátis",
                que leva a cadastro. */}
            <Link
              href="/para-medicos"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'px-2 text-xs text-primary sm:px-3 sm:text-sm',
              )}
            >
              Para médicos
            </Link>
            <Button
              size="sm"
              className="px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => openCheckout('Pessoal')}
            >
              Começar grátis
            </Button>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'px-2 text-xs sm:px-3 sm:text-sm',
              )}
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1.5 text-[13px] font-medium text-primary">
              <Activity className="h-3.5 w-3.5" /> O histórico que nenhum laboratório tem
            </span>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
              Todos os seus exames, de <span className="text-primary">todos os laboratórios</span>,
              num histórico só.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Cada laboratório só tem o que você fez nele. O ExCenter reúne os laudos de todos — de
              qualquer lab — e mostra a evolução de cada marcador ao longo do tempo.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => openCheckout('Pessoal')}>
                Começar grátis →
              </Button>
              <a href="#como">
                <Button size="lg" variant="outline">
                  Ver como funciona
                </Button>
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Sem cartão para começar · 3
              envios de exames no plano grátis
            </p>
          </div>

          {/* Showcard — réplica fiel do gráfico real de tendência: badge = último vs. anterior
              (neutro), pontos fora da faixa em vermelho, e o tooltip de procedência (lab + médico)
              aberto sobre um ponto, como quando o usuário passa o mouse. */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold">Colesterol total</div>
                <div className="text-xs text-muted-foreground">
                  4 laudos · 3 laboratórios diferentes
                </div>
              </div>
              {/* Neutro de propósito, igual ao app: mostra a variação do valor MAIS RECENTE em
                  relação ao anterior (190 vs. 200 = −5%), não a queda total do período. */}
              <span
                className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                title="Variação do valor mais recente em relação ao anterior"
              >
                ↓ 5% vs. anterior
              </span>
            </div>
            <div className="relative my-1.5">
              <svg
                viewBox="0 0 360 176"
                className="w-full"
                role="img"
                aria-label="Tendência do colesterol total ao longo de 4 laudos, caindo de 232 para 190 (dentro da faixa de referência de menos de 190). Ao passar o mouse num ponto, o gráfico mostra o laboratório e o médico daquele exame."
              >
                {/* faixa de referência (< 190) */}
                <rect x="34" y="122" width="306" height="28" className="fill-primary-light" />
                <text x="38" y="138" className="fill-primary font-mono" fontSize="8.5">
                  faixa de referência &lt; 190
                </text>
                {/* eixos */}
                <line x1="34" y1="18" x2="34" y2="150" className="stroke-border" strokeWidth="1" />
                <line
                  x1="34"
                  y1="150"
                  x2="340"
                  y2="150"
                  className="stroke-border"
                  strokeWidth="1"
                />
                {/* linha da série */}
                <polyline
                  points="60,45 150,78 240,103 320,122"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* guia vertical do ponto sob o cursor (dez/24) */}
                <line
                  x1="240"
                  y1="18"
                  x2="240"
                  y2="150"
                  className="stroke-primary-dark"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                />
                {/* pontos: fora da faixa (> 190) em vermelho; o de 190 (dentro) em verde */}
                <g className="font-mono">
                  <circle cx="60" cy="45" r="4" className="fill-destructive" />
                  <text
                    x="60"
                    y="35"
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="9"
                  >
                    232
                  </text>
                  <circle cx="150" cy="78" r="4" className="fill-destructive" />
                  <text
                    x="150"
                    y="68"
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="9"
                  >
                    214
                  </text>
                  <circle
                    cx="240"
                    cy="103"
                    r="6"
                    className="fill-destructive"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <circle cx="320" cy="122" r="4.5" className="fill-primary" />
                  <text x="320" y="112" textAnchor="middle" className="fill-primary" fontSize="9">
                    190
                  </text>
                </g>
                {/* datas */}
                <g className="fill-muted-foreground font-mono" fontSize="8">
                  <text x="60" y="164" textAnchor="middle">
                    mar/24
                  </text>
                  <text x="150" y="164" textAnchor="middle">
                    jul/24
                  </text>
                  <text x="240" y="164" textAnchor="middle">
                    dez/24
                  </text>
                  <text x="320" y="164" textAnchor="middle">
                    mai/25
                  </text>
                </g>
                {/* cursor do mouse apontando pro ponto sob foco (dez/24) */}
                <g transform="translate(243,105)">
                  <path
                    d="M0,0 L0,15 L4,11 L7,17 L9,16 L6,10 L11,10 Z"
                    className="fill-foreground stroke-white"
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
              {/* Tooltip ancorado ao ponto (dez/24): pequeno e leve, flutua acima da bolinha —
                  espelha o hover real do app. Acessório, não cobre a série. */}
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card/95 px-2 py-1 text-[11px] shadow-sm"
                style={{
                  left: '66.7%',
                  top: '58.5%',
                  transform: 'translate(-50%, calc(-100% - 12px))',
                }}
              >
                <div>
                  <span className="font-semibold text-foreground">200 mg/dL</span>
                  <span className="text-muted-foreground"> · 12 de dez. de 24</span>
                </div>
                <div className="text-muted-foreground">Frischmann Aisengart · Dr. Bruno Lima</div>
              </div>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">
              Os 4 laudos deste exemplo vieram de{' '}
              <b className="font-medium text-foreground">3 laboratórios diferentes</b> — reunidos
              automaticamente num histórico só:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                Fleury
              </span>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                Frischmann Aisengart
              </span>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                Unimed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      {/* As bolinhas são SEPARADORES de uma linha só — no celular cada frase ocupa a sua, e a
          bolinha sobrava sozinha na direita, parecendo defeito. Some abaixo de sm: sem uma linha
          para dividir, separador não separa nada. */}
      <div className="border-y border-border bg-muted/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-4 text-center text-sm text-muted-foreground">
          <span>
            Reúne <b className="text-foreground">todos os laboratórios</b>
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>
            <b className="text-foreground">Um só nome</b> por exame
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>
            Seus dados <b className="text-foreground">nunca vendidos</b>
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>
            <b className="text-foreground">Sem precisar digitar nada</b>
          </span>
        </div>
      </div>

      {/* PROBLEMA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-11 max-w-2xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            O problema
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Cada laboratório só conhece metade da sua história.
          </h2>
          <p className="mt-3.5 text-lg text-muted-foreground">
            O portal do lab só mostra os exames que você fez <b>nele</b> — e é um login diferente
            pra cada laboratório. Trocou de lab, seu histórico se partiu; e ninguém enxerga a
            evolução ao longo dos anos, que é justamente o que importa.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted/40 p-6">
            <div className="mb-3.5 font-mono text-[11px] uppercase tracking-wider text-destructive">
              Hoje, sem o ExCenter
            </div>
            <ul className="space-y-3 text-[15px] text-muted-foreground">
              <li className="flex gap-3">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Um login e senha
                diferente pra cada laboratório
              </li>
              <li className="flex gap-3">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Cada laboratório só
                guarda o que você fez lá
              </li>
              <li className="flex gap-3">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> O mesmo exame com
                nomes diferentes em cada lab
              </li>
              <li className="flex gap-3">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Você não enxerga se
                um valor sobe ou cai no tempo
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3.5 font-mono text-[11px] uppercase tracking-wider text-primary">
              Com o ExCenter
            </div>
            <ul className="space-y-3 text-[15px]">
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{' '}
                <span>
                  <b>Um acesso só</b> — todos os laboratórios num lugar
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{' '}
                <span>Todos os exames reunidos e comparáveis</span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{' '}
                <span>
                  Nomes diferentes viram <b>um só</b> — o histórico cruza os labs
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{' '}
                <span>Tendência de cada marcador ao longo dos anos</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-11 max-w-2xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Como funciona
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Do PDF ao histórico, em três passos.
          </h2>
          <p className="mt-3.5 text-lg text-muted-foreground">
            Sem precisar digitar nada. Sem planilha. Você envia; a gente faz o trabalho chato.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              n: '01',
              t: 'Envie o laudo',
              d: 'Arraste o PDF do exame — de qualquer laboratório. Vários de uma vez, se quiser. Envio por foto chega em breve.',
            },
            {
              n: '02',
              t: 'Padronizamos com rigor',
              d: 'Cada resultado, unidade e faixa é extraído e conferido. Nomes diferentes para o mesmo exame são unificados com critério — sem misturar o que é distinto.',
            },
            {
              n: '03',
              t: 'Acompanhe a evolução',
              d: 'Veja tendências, valores fora da faixa e compare laudos ao longo do tempo — pronto para levar ao seu médico.',
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-primary-light font-mono text-[13px] font-bold text-primary">
                {s.n}
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        {/* As telas de verdade logo abaixo dos passos: o texto promete simplicidade, os prints
            entregam a prova antes de o visitante ter que acreditar. Ficam na ordem do passo que
            cada um ilustra — envio (01) e acompanhamento (03); o passo 02 tem a seção inteira
            de normalização logo em seguida. */}
        <div className="mt-12 space-y-10">
          {[
            {
              n: '01',
              legend: 'Você arrasta os PDFs — de um laboratório ou de cinco.',
              Mockup: AppHomeMockup,
            },
            {
              n: '03',
              legend: 'Todos os exames viram uma lista só, de qualquer laboratório.',
              Mockup: ExamListMockup,
            },
          ].map(({ n, legend, Mockup }) => (
            <div key={n}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-light font-mono text-[11px] font-bold text-primary">
                  {n}
                </span>
                <span className="text-sm text-muted-foreground">{legend}</span>
              </div>
              <Mockup />
            </div>
          ))}
        </div>
      </section>

      {/* NORMALIZAÇÃO */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 rounded-3xl border border-border bg-card p-8 shadow-sm md:grid-cols-2 md:p-11">
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
              A peça-chave
            </div>
            <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              Três nomes, formatos diferentes — um exame só.
            </h2>
            <p className="mt-3.5 text-muted-foreground">
              Cada laboratório escreve do seu jeito: “AST”, “Transaminase oxalacética”, “Aspartato
              aminotransferase”. Nosso processo reconhece, com rigor, que são o <b>mesmo exame</b> e
              unifica tudo sob um nome só. É esse cuidado que faz o seu histórico cruzar
              laboratórios de verdade — sem misturar o que não deve, e sem você arrumar nada.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2.5">
              {[
                ['Fleury', 'AST'],
                ['Frischmann Aisengart', 'Transaminase oxalacética'],
                ['Unimed', 'Aspartato aminotransferase'],
              ].map(([lab, raw]) => (
                <div key={lab} className="rounded-xl border border-border bg-muted px-3.5 py-2.5">
                  <div className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    {lab}
                  </div>
                  <div className="font-mono text-[13px] font-semibold">{raw}</div>
                </div>
              ))}
            </div>
            <div className="rotate-90 self-center text-2xl text-primary sm:rotate-0">→</div>
            <div className="flex-1 rounded-2xl border border-primary bg-primary-light px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                Um só nome
              </div>
              <div className="text-lg font-semibold text-primary-dark">TGO</div>
              <div className="font-mono text-[11px] text-primary-soft">
                usado em todo o seu histórico
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LAUDO EXCENTER */}
      {/* O produto tem uma saída física — um PDF. Mostrar a folha é o argumento mais concreto
          da página, e é aqui que entra o laudo ORIGINAL: quem desconfia da extração precisa
          saber que a fonte continua acessível. */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
              Para levar à consulta
            </div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Um laudo novo, com o histórico junto.
            </h2>
            <p className="mt-3.5 text-lg text-muted-foreground">
              Cada exame vira um documento em PDF com todos os resultados daquele laudo — e, ao lado
              de cada um, a evolução do marcador nos exames anteriores. O que estiver fora da faixa
              ganha um gráfico grande no fim.
            </p>
            <ul className="mt-6 space-y-3.5">
              {[
                [
                  'Todos os resultados daquele exame',
                  'Nada é resumido nem descartado: o laudo inteiro, no mesmo documento.',
                ],
                [
                  'Cada valor com o seu histórico ao lado',
                  'Um mini-gráfico por linha mostra de onde o valor veio — mesmo que os exames anteriores sejam de outro laboratório.',
                ],
                [
                  'O laudo original, se você preferir',
                  'O arquivo que o laboratório emitiu fica guardado: dá para abrir na tela ou baixar a qualquer momento, exatamente como veio.',
                ],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <b className="text-[15px]">{t}</b>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <LaudoMockup />
        </div>
      </section>

      {/* COMPARTILHAR */}
      {/* Vem logo depois do laudo de propósito: a seção anterior termina em "levar à consulta",
          e a pergunta seguinte de quem lê é "e se eu não for até lá?". É também a única parte
          do produto que o usuário faz COM outra pessoa — todo o resto é solitário —, e quem
          recebe o link costuma ser um médico que ainda não conhece o ExCenter.
          Mockup à ESQUERDA, invertendo a seção anterior, pra página não virar uma coluna só. */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <ShareMockup />
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
              Para mandar ao médico
            </div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Um link temporário, e pronto.
            </h2>
            <p className="mt-3.5 text-lg text-muted-foreground">
              Em vez de mandar o PDF solto no WhatsApp, você gera um endereço que abre o exame com
              a evolução de cada marcador junto. Quem recebe só clica.
            </p>
            <ul className="mt-6 space-y-3.5">
              {[
                [
                  'Sem conta, sem instalar nada',
                  'O link abre no navegador de quem recebeu — celular ou computador, tanto faz.',
                ],
                [
                  'Você escolhe por quanto tempo',
                  'De 24 horas a 30 dias. Passou o prazo, o link para de funcionar sozinho — e dá para encerrar antes quando quiser.',
                ],
                [
                  'O laudo original vai junto',
                  'Quem abrir pode conferir o arquivo que o laboratório emitiu, do lado do histórico que o ExCenter montou.',
                ],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <b className="text-[15px]">{t}</b>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
            {/* Separa do piloto médico, que é outra coisa e ainda não existe. Sem esta linha, o
                leitor junta as duas promessas e cobra a que não está no ar. */}
            <p className="mt-6 text-sm text-muted-foreground">
              Precisa de algo mais duradouro?{' '}
              <Link href="/para-medicos" className="font-medium text-primary hover:underline">
                O acesso para médicos
              </Link>{' '}
              — com verificação profissional e autorização revogável — está em desenvolvimento.
            </p>
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-11 max-w-2xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Recursos
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Tudo que um monte de PDFs nunca vai te dar.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              i: FileText,
              t: 'Sem precisar digitar nada',
              d: 'Você só envia o PDF do laudo — de qualquer laboratório. Extraímos resultados, unidades, material e faixas para você.',
              hl: false,
            },
            {
              i: Dna,
              t: 'Um exame, não dez nomes',
              d: 'Nomes e formatos diferentes para o mesmo exame são unificados com rigor — é isso que faz seu histórico cruzar laboratórios sem misturar nada.',
              hl: true,
            },
            {
              i: LineChart,
              t: 'Tendências no tempo',
              d: 'Cada marcador vira uma série. Enxergue de um golpe se está subindo, caindo ou estável.',
              hl: false,
            },
            {
              i: Target,
              t: 'Faixas & alertas',
              d: 'Sinalizamos o que está fora da referência — considerando material e, quando há, sexo e idade.',
              hl: false,
            },
            {
              i: Building2,
              t: 'Multi-laboratório',
              d: 'Fleury, Frischmann Aisengart, Unimed, o laboratório do bairro — tudo no mesmo lugar, comparável.',
              hl: false,
            },
            {
              i: Share2,
              t: 'Leve ao seu médico',
              d: 'Exporte um resumo limpo com as tendências para a consulta — o que ele sempre quis ver e nunca teve.',
              hl: false,
            },
          ].map(({ i: Icon, t, d, hl }) => (
            <div
              key={t}
              className={
                hl
                  ? 'rounded-2xl border border-primary bg-primary p-6 text-primary-foreground'
                  : 'rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md'
              }
            >
              <div
                className={
                  hl
                    ? 'mb-4 grid h-11 w-11 place-items-center rounded-xl bg-white/15'
                    : 'mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary'
                }
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold tracking-tight">{t}</h3>
              <p
                className={
                  hl ? 'text-sm text-primary-foreground/85' : 'text-sm text-muted-foreground'
                }
              >
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 rounded-3xl border border-border bg-card p-8 shadow-sm md:grid-cols-2 md:p-11">
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
              Privacidade & segurança
            </div>
            <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              Dado de saúde é sagrado. A gente trata assim.
            </h2>
            <p className="mt-3.5 text-muted-foreground">
              Seu histórico é só seu. Não vendemos seus dados, e você mantém o controle: apaga o que
              quiser, quando quiser.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              {
                i: Lock,
                t: 'Seu histórico é privado',
                d: 'Nenhuma outra conta alcança seus exames. Seu médico só vê o que você autorizar — e você tira o acesso quando quiser.',
              },
              {
                i: ShieldCheck,
                t: 'Cuidado à altura de um dado de saúde',
                d: 'Tratamos suas informações com a proteção séria que elas exigem.',
              },
              { i: Ban, t: 'Nunca vendemos seus dados', d: 'Seu histórico não é produto. Ponto.' },
              {
                i: Trash2,
                t: 'Você no controle',
                d: 'Apague seus exames — ou a conta inteira — quando quiser.',
              },
            ].map(({ i: Icon, t, d }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <b className="text-[15px]">{t}</b>
                  <div className="text-[13px] text-muted-foreground">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PARA MÉDICOS */}
      {/* Fica logo depois de Segurança porque o argumento do médico é a autorização do paciente
          — a seção anterior acabou de explicar quem manda no acesso. E antes de Preços: quem se
          reconhece aqui vai olhar a tabela com outra pergunta na cabeça. */}
      <section id="medicos" aria-labelledby="medical-title" className="mx-auto max-w-6xl px-6 pb-6">
        <div className="grid overflow-hidden rounded-3xl bg-primary-dark text-primary-foreground md:grid-cols-2">
          <div className="flex flex-col items-start justify-center p-7 md:p-9 lg:p-11">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary-foreground/80">
              Para médicos
            </p>
            <h2
              id="medical-title"
              className="text-balance text-2xl font-semibold tracking-tight md:text-3xl"
            >
              Você é médico? Receba com facilidade o histórico pronto, não exames sem contexto.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/85">
              Seu paciente autoriza, e você vê os exames com a evolução de cada marcador.
            </p>
            <Link
              href="/para-medicos"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mt-5 h-auto min-h-10 whitespace-normal border-white/25 bg-white text-center text-primary-dark hover:bg-white/90 hover:text-primary-dark',
              )}
            >
              Ver o acesso para médicos →
            </Link>
            <p className="mt-5 text-xs leading-relaxed text-primary-foreground/80">
              O acesso depende de verificação profissional e da autorização do paciente.
            </p>
          </div>
          <figure className="relative min-h-72 md:min-h-96">
            <Image
              src="/images/medical-pilot-doctors.png"
              alt="Imagem ilustrativa de dois médicos conversando enquanto consultam um tablet."
              fill
              sizes="(min-width: 1152px) 552px, (min-width: 768px) 50vw, 100vw"
              className="object-cover object-center"
            />
          </figure>
        </div>
      </section>

      {/* PREÇOS */}
      <section id="precos" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Preços
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Comece grátis. Assine quando fizer sentido.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Sem pegadinha. Cancele a qualquer momento — seu histórico continua seu.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full border border-input bg-muted p-1">
              <button
                onClick={() => setForTeams(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${!forTeams ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              >
                Para você
              </button>
              <button
                onClick={() => setForTeams(true)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${forTeams ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              >
                Para equipes
              </button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-input bg-muted p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${!annual ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${annual ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              >
                Anual{' '}
                <span className="ml-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">
                  -17%
                </span>
              </button>
            </div>
          </div>
          {forTeams && (
            <p className="mt-4 text-sm text-muted-foreground">
              Clínica, casa de apoio, instituição: você convida, cada pessoa tem a{' '}
              <b className="text-foreground">própria conta</b> — privada como qualquer outra — e o
              pagamento fica centralizado com você.
            </p>
          )}
        </div>

        {forTeams ? (
          <div className="mx-auto grid max-w-md gap-5 md:max-w-none md:grid-cols-3">
            {/* Clínica */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-7 shadow-md">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground">
                Mais procurado
              </span>
              <div className="text-lg font-semibold">Clínica</div>
              <div className="mt-1 min-h-[38px] text-sm text-muted-foreground">
                Consultórios e equipes de saúde acompanhando de perto.
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight">
                {annual ? 'R$ 124' : 'R$ 149'}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
              <div className="mb-5 mt-1 min-h-[18px] text-xs text-muted-foreground">
                {annual ? 'R$ 1.490/ano — 2 meses grátis.' : 'Cobrado mensalmente.'}
              </div>
              <Button className="mb-6 w-full" onClick={() => openCheckout('Clínica')}>
                Assinar Clínica
              </Button>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  '5 contas com envios de exames ilimitados',
                  '+ 3 contas Pessoal (até 20 envios por mês cada)',
                  'Cada pessoa com a própria conta privada',
                  'Você convida e centraliza o pagamento',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Casa de Apoio */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="text-lg font-semibold">Casa de Apoio</div>
              <div className="mt-1 min-h-[38px] text-sm text-muted-foreground">
                Casas de apoio e de repouso, acompanhando muita gente ao mesmo tempo.
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight">
                {annual ? 'R$ 232' : 'R$ 279'}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
              <div className="mb-5 mt-1 min-h-[18px] text-xs text-muted-foreground">
                {annual ? 'R$ 2.790/ano — 2 meses grátis.' : 'Cobrado mensalmente.'}
              </div>
              <Button
                variant="outline"
                className="mb-6 w-full"
                onClick={() => openCheckout('Casa de Apoio')}
              >
                Assinar Casa de Apoio
              </Button>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  '10 contas com envios de exames ilimitados',
                  '+ 5 contas Pessoal (até 20 envios por mês cada)',
                  'Cada pessoa com a própria conta privada',
                  'Melhor custo por conta',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Instituição ou personalizado — degrau sem preço, e de propósito não é só "maior":
              qualquer QUANTIDADE customizada de contas (4, 7, 40...) é conversa, não checkout. */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="text-lg font-semibold">Instituição ou personalizado</div>
              <div className="mt-1 min-h-[38px] text-sm text-muted-foreground">
                Operadoras, redes e programas de saúde — ou o número exato de contas que você
                precisa.
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">Sob medida</div>
              <div className="mb-5 mt-1 min-h-[18px] text-xs text-muted-foreground">
                Do seu tamanho, seja ele qual for.
              </div>
              {/* Âncora com a cara de botão (buttonVariants): mailto é link, não ação de página. */}
              <a
                href={`mailto:${TEAM_CONTACT_EMAIL}?subject=${encodeURIComponent('ExCenter para instituições')}`}
                className={cn(buttonVariants({ variant: 'outline' }), 'mb-6 w-full')}
              >
                Falar com a gente
              </a>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  'Quantidade de contas sob medida — 4, 7, 40…',
                  'Mistura de contas ilimitadas e Pessoal como você precisar',
                  'Cada pessoa com a própria conta privada',
                  'Implantação acompanhada',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-md gap-5 md:max-w-none md:grid-cols-3">
            {/* Grátis */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="text-lg font-semibold">Grátis</div>
              <div className="mt-1 min-h-[38px] text-sm text-muted-foreground">
                Para experimentar e guardar seus primeiros exames.
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight">
                R$ 0<span className="text-sm font-normal text-muted-foreground">/sempre</span>
              </div>
              <div className="mb-5 mt-1 min-h-[18px] text-xs text-muted-foreground">
                Sem cartão.
              </div>
              <Button
                variant="outline"
                className="mb-6 w-full"
                onClick={() => openCheckout('Grátis')}
              >
                Começar agora
              </Button>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  '3 envios de exames',
                  'Histórico de 90 dias',
                  'Gráficos básicos',
                  'Envio por PDF (por foto: em breve)',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
                {['Tendências completas', 'Exportar para o médico'].map((f) => (
                  <li key={f} className="flex gap-2.5 text-muted-foreground/60">
                    <Minus className="h-4 w-4 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pessoal */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-7 shadow-md">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground">
                Mais popular
              </span>
              <div className="text-lg font-semibold">Pessoal</div>
              <div className="mt-1 min-h-[38px] text-sm text-muted-foreground">
                Seu histórico de saúde completo, para o dia a dia.
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight">
                {annual ? 'R$ 16' : 'R$ 19'}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
              <div className="mb-5 mt-1 min-h-[18px] text-xs text-muted-foreground">
                {annual ? 'R$ 190/ano — 2 meses grátis.' : 'Cobrado mensalmente.'}
              </div>
              <Button className="mb-6 w-full" onClick={() => openCheckout('Pessoal')}>
                Assinar Pessoal
              </Button>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  'Até 20 envios de exames por mês',
                  'Histórico completo, sem limite de tempo',
                  'Todas as tendências e comparações',
                  'Alertas de fora-da-faixa',
                  'Exportar resumo para o médico',
                  'Suporte prioritário',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Ilimitado */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="text-lg font-semibold">Ilimitado</div>
              <div className="mt-1 min-h-[38px] text-sm text-muted-foreground">
                Para digitalizar anos de exames ou acompanhar de perto.
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight">
                {annual ? 'R$ 32' : 'R$ 39'}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
              <div className="mb-5 mt-1 min-h-[18px] text-xs text-muted-foreground">
                {annual ? 'R$ 390/ano — 2 meses grátis.' : 'Cobrado mensalmente.'}
              </div>
              <Button
                variant="outline"
                className="mb-6 w-full"
                onClick={() => openCheckout('Ilimitado')}
              >
                Assinar Ilimitado
              </Button>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  'Tudo do Pessoal',
                  'Envios de exames ilimitados',
                  'Ideal para importar exames antigos de uma vez',
                  'Acompanhamento frequente, sem teto',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <AboutSection />

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-8 text-center">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Dúvidas
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Perguntas frequentes</h2>
        </div>
        <div>
          {/* As perguntas moram em landing-faq.ts porque o MESMO conteúdo alimenta o JSON-LD
              FAQPage em app/page.tsx — o Google exige que dado estruturado de FAQ corresponda
              ao texto visível, e duas cópias divergiriam na primeira edição. */}
          {LANDING_FAQ.map(({ q, a }, idx) => (
            <details key={q} open={idx === 0} className="group border-b border-border py-1.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.06rem] font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-primary transition-transform group-open:rotate-45">
                  <Plus className="h-4 w-4" />
                </span>
              </summary>
              <p className="pb-5 text-[15px] text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-primary-dark px-8 py-14 text-center text-primary-foreground">
          <h2 className="mx-auto max-w-xl text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Seus próximos exames merecem virar história.
          </h2>
          <p className="mx-auto mt-3.5 max-w-md text-lg text-primary-foreground/80">
            Comece grátis hoje. Em poucos minutos, o primeiro PDF já vira tendência.
          </p>
          <div className="mt-7 flex justify-center">
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-white text-primary-dark hover:bg-white/90 hover:text-primary-dark"
              onClick={() => openCheckout('Pessoal')}
            >
              Começar grátis →
            </Button>
          </div>
          <div className="mt-4 text-sm text-primary-foreground/70">
            Sem cartão para começar · Cancele quando quiser
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <BrandLogo size="sm" withTagline className="text-foreground" />
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a href="#recursos" className="hover:text-primary">
              Recursos
            </a>
            <a href="#precos" className="hover:text-primary">
              Preços
            </a>
            <a href="#seguranca" className="hover:text-primary">
              Segurança
            </a>
            <Link href="/login" className="hover:text-primary">
              Entrar
            </Link>
            <Link href="/para-medicos" className="hover:text-primary">
              Para médicos
            </Link>
            <a href="#quem-somos" className="hover:text-primary">
              Quem somos
            </a>
            <a href={`mailto:${TEAM_CONTACT_EMAIL}`} className="hover:text-primary">
              Contato
            </a>
          </div>
          <span>© 2026 ExCenter · Não substitui avaliação médica</span>
        </div>
      </footer>

      {checkout && <CheckoutModal plan={checkout} onClose={() => setCheckout(null)} />}
    </div>
  );
}
