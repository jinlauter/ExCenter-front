'use client';

import { Activity } from 'lucide-react';
import { LaudoSparkline } from '@/components/laudo-sparkline';
import { TrendChart } from '@/components/trend-chart';

// Prévia do laudo ExCenter — o PDF que o usuário gera em /resultados/[id]/imprimir. Usa os
// MESMOS componentes de gráfico do documento real (LaudoSparkline por linha, TrendChart no
// destaque), então o que a landing promete é literalmente o que sai na impressão.
//
// As cores fixas em hex repetem as de laudo-print.css pelo mesmo motivo que lá: é papel, e
// papel não tem tema. A folha é cortada embaixo com um degradê — é uma prévia da primeira
// página, não o documento inteiro.

const DATE = (d: string) => new Date(`${d}T12:00:00Z`);

const PANELS = [
  {
    name: 'Perfil lipídico',
    meta: 'Material: Soro  ·  Método: Enzimático colorimétrico',
    rows: [
      {
        name: 'Colesterol total',
        ref: 'Referência: até 190 mg/dL',
        value: '190 mg/dL',
        abnormal: false,
        range: { min: null, max: 190 },
        history: [
          { date: DATE('2024-03-14'), value: 232 },
          { date: DATE('2024-07-02'), value: 214 },
          { date: DATE('2024-12-12'), value: 200 },
          { date: DATE('2025-05-20'), value: 190 },
        ],
      },
      {
        name: 'HDL',
        ref: 'Referência: acima de 40 mg/dL',
        value: '54 mg/dL',
        abnormal: false,
        range: { min: 40, max: null },
        history: [
          { date: DATE('2024-03-14'), value: 41 },
          { date: DATE('2024-07-02'), value: 46 },
          { date: DATE('2024-12-12'), value: 49 },
          { date: DATE('2025-05-20'), value: 54 },
        ],
      },
      {
        name: 'Triglicerídeos',
        ref: 'Referência: até 150 mg/dL',
        value: '188 mg/dL',
        abnormal: true,
        range: { min: null, max: 150 },
        history: [
          { date: DATE('2024-03-14'), value: 210 },
          { date: DATE('2024-07-02'), value: 196 },
          { date: DATE('2024-12-12'), value: 181 },
          { date: DATE('2025-05-20'), value: 188 },
        ],
      },
    ],
  },
  {
    name: 'Glicemia de jejum',
    meta: 'Material: Soro  ·  Método: Hexoquinase',
    rows: [
      {
        name: 'Glicose',
        ref: 'Referência: 70 a 99 mg/dL',
        value: '104 mg/dL',
        abnormal: true,
        range: { min: 70, max: 99 },
        history: [
          { date: DATE('2024-03-14'), value: 96 },
          { date: DATE('2024-07-02'), value: 99 },
          { date: DATE('2024-12-12'), value: 101 },
          { date: DATE('2025-05-20'), value: 104 },
        ],
      },
    ],
  },
];

const HIGHLIGHT = {
  name: 'Glicose (mg/dL)',
  ref: 'Referência: 70 a 99 mg/dL',
  range: { min: 70, max: 99 },
  points: [
    { date: DATE('2024-03-14'), value: 96, laboratoryName: 'Fleury', requestingDoctor: 'Dra. Helena Sato' },
    { date: DATE('2024-07-02'), value: 99, laboratoryName: 'Unimed', requestingDoctor: 'Dra. Helena Sato' },
    { date: DATE('2024-12-12'), value: 101, laboratoryName: 'Frischmann Aisengart', requestingDoctor: 'Dr. Bruno Lima' },
    { date: DATE('2025-05-20'), value: 104, laboratoryName: 'Frischmann Aisengart', requestingDoctor: 'Dr. Bruno Lima' },
  ],
};

const HEAD_ITEMS = [
  ['Data do exame', '20 de maio de 2025'],
  ['Médico solicitante', 'Dr. Bruno Lima'],
  ['Laboratório', 'Frischmann Aisengart'],
];

export function LaudoMockup() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-[#f3f4f6] p-4 shadow-xl sm:p-6">
      {/* A folha A4, recortada: mostra o topo do documento e some no degradê. */}
      {/* O corte precisa passar do "Em destaque": é o gráfico grande que prova o enriquecimento
          com histórico, e um recorte que parasse nos painéis esconderia justamente o argumento. */}
      <div className="relative max-h-[830px] overflow-hidden rounded-sm bg-white px-4 py-5 text-[#111827] shadow-[0_2px_14px_rgba(0,0,0,0.13)] sm:px-7 sm:py-6">
        <div className="flex flex-col items-start justify-between gap-1.5 border-b-[2.5px] border-[#0f6e56] pb-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#e1f5ee] text-[#0f6e56]">
              <Activity size={20} strokeWidth={1.9} aria-hidden />
            </span>
            <span>
              <span className="block text-[19px] font-semibold tracking-tight text-[#04342c]">ExCenter</span>
              <span className="block text-[9.5px] text-[#6b7280]">Seus exames, um só histórico</span>
            </span>
          </div>
          <div className="text-left text-[9.5px] leading-relaxed text-[#6b7280] sm:text-right">
            Documento gerado em 06/09/2026
            <br />a partir de laudo de <b>Frischmann Aisengart</b>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-1.5 rounded-lg border border-[#e5e7eb] bg-[#fafcfb] px-3.5 py-2.5">
          {HEAD_ITEMS.map(([label, value]) => (
            <div key={label}>
              <div className="text-[8px] uppercase tracking-[0.8px] text-[#6b7280]">{label}</div>
              <div className="mt-px text-[11.5px] font-semibold">{value}</div>
            </div>
          ))}
          <span className="ml-auto whitespace-nowrap rounded-full border border-[#fcd34d] bg-[#fffbeb] px-2.5 py-1 text-[10px] font-semibold text-[#b45309]">
            2 de 18 fora da faixa
          </span>
        </div>

        {PANELS.map((panel) => (
          <section key={panel.name} className="mt-3 overflow-hidden rounded-lg border border-[#e5e7eb]">
            <div className="flex flex-col justify-between gap-0.5 border-b border-[#e5e7eb] bg-[#f8faf9] px-3 py-1.5 sm:flex-row sm:items-baseline">
              <h3 className="text-[11px] font-semibold text-[#04342c]">{panel.name}</h3>
              <span className="text-[8.5px] text-[#6b7280]">{panel.meta}</span>
            </div>
            {panel.rows.map((row) => (
              <div
                key={row.name}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border-t border-[#f1f5f3] px-3 py-1 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium">{row.name}</p>
                  <p className="mt-px text-[8px] text-[#6b7280]">{row.ref}</p>
                </div>
                <div className="order-last w-full shrink-0 [&_svg]:h-auto [&_svg]:w-full sm:order-none sm:w-[190px]">
                  <LaudoSparkline points={row.history} referenceRange={row.range} />
                </div>
                <div
                  className={`w-[110px] shrink-0 text-right text-[10.5px] font-semibold ${row.abnormal ? 'text-[#b45309]' : ''}`}
                >
                  {row.value}
                  {row.abnormal && <span className="block text-[7.5px] font-semibold text-[#b45309]">fora da faixa</span>}
                </div>
              </div>
            ))}
          </section>
        ))}

        <h3 className="mt-5 border-t-[2.5px] border-[#0f6e56] pt-3.5 text-[13px] font-semibold text-[#04342c]">
          Em destaque: evolução dos marcadores fora da faixa
        </h3>
        <p className="mt-0.5 text-[9.5px] text-[#6b7280]">
          Histórico completo no ExCenter — todos os laboratórios, no mesmo gráfico.
        </p>
        <div className="mt-2.5 rounded-lg border border-[#e5e7eb] px-3 py-2.5">
          <h4 className="text-[11px] font-semibold">{HIGHLIGHT.name}</h4>
          <p className="mb-1.5 mt-px text-[8.5px] text-[#6b7280]">{HIGHLIGHT.ref}</p>
          <TrendChart points={HIGHLIGHT.points} unit="mg/dL" referenceRange={HIGHLIGHT.range} />
        </div>

        {/* Corte da folha: o documento continua, a prévia não precisa. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
      </div>

      <figcaption className="mt-3 text-center text-[11px] text-muted-foreground">
        Primeira página do laudo gerado pelo ExCenter · dados ilustrativos
      </figcaption>
    </figure>
  );
}
