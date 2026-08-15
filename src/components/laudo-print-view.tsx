'use client';

import { useEffect } from 'react';
import { Activity, Printer, X } from 'lucide-react';
import { LaudoSparkline } from '@/components/laudo-sparkline';
import { TrendChart } from '@/components/trend-chart';
import { resolveReferenceRange } from '@/lib/reference-range';
import type { ExamDetailResponse, ExamDetailResult } from '@/types/api';

// =============================================================================
// LaudoPrintView — o "laudo ExCenter": o documento que o usuário salva em PDF
// =============================================================================
// Template aprovado em protótipo (excenter-snapshots/2026-08-14-laudo-template): cabeçalho com
// a marca, cartão data/médico/lab/badge, painéis na ordem do laudo com um SPARKLINE por linha
// (evolução de relance sem explodir o número de páginas) e a seção "Em destaque" com gráficos
// grandes SÓ dos marcadores fora da faixa — o argumento de venda do produto num gráfico.
//
// O PDF nasce do próprio motor de impressão do browser (window.print → "Salvar como PDF"),
// idêntico ao protótipo aprovado, que foi gerado pelo mesmo motor. CSS fixo em hex e não nos
// tokens do tema: documento imprime igual pra todo mundo, e foi este visual que foi aprovado.
// =============================================================================

function formatDateLong(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatValue(result: ExamDetailResult) {
  if (result.numericResultValue != null) {
    const num = result.numericResultValue.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    return result.unit ? `${num} ${result.unit}` : num;
  }
  return result.stringResultValue ?? '—';
}

function titleCase(raw?: string | null) {
  if (!raw) return null;
  return raw.toLowerCase().replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function LaudoRow({ result, showName }: { result: ExamDetailResult; showName: boolean }) {
  const range = resolveReferenceRange(result.referenceMin, result.referenceMax, result.referenceValue);
  const hasHistory = result.history.length >= 2 && result.numericResultValue != null;

  return (
    <div className="laudo-row">
      <div className="laudo-row-info">
        {showName && <p className="laudo-row-name">{result.parameterName}</p>}
        {result.referenceValue && <p className="laudo-row-ref">Referência: {result.referenceValue}</p>}
      </div>
      {hasHistory ? (
        <div className="laudo-row-spark">
          <LaudoSparkline
            points={result.history.map((p) => ({ date: new Date(p.date), value: p.value }))}
            referenceRange={range}
          />
        </div>
      ) : (
        <div className="laudo-row-spark laudo-row-spark-empty">
          primeiro registro —<br />sem histórico ainda
        </div>
      )}
      <div className={`laudo-row-value${result.isAbnormal ? ' laudo-abnormal' : ''}`}>
        {formatValue(result)}
        {result.isAbnormal && <span className="laudo-row-flag">fora da faixa</span>}
      </div>
    </div>
  );
}

export function LaudoPrintView({ exam }: { exam: ExamDetailResponse }) {
  // O documento é o destino final da rota — imprimir é o que o usuário veio fazer. O delay dá
  // tempo dos SVGs montarem antes do diálogo congelar a página.
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 700);
    return () => clearTimeout(timer);
  }, []);

  const generatedAt = new Date().toLocaleDateString('pt-BR');
  const date = formatDateLong(exam.examDate);
  const lab = titleCase(exam.laboratoryName);
  const highlighted = exam.groups
    .flatMap((g) => g.results)
    .filter((r) => r.isAbnormal && r.history.length >= 2 && r.numericResultValue != null);

  return (
    <div className="laudo-root">
      {/* Barra visível só em TELA: quem caiu aqui sem querer volta; quem fechou o diálogo
          reimprime sem F5. Some no papel. */}
      <div className="laudo-toolbar">
        <button type="button" onClick={() => window.print()} className="laudo-toolbar-print">
          <Printer size={15} aria-hidden />
          Salvar como PDF / Imprimir
        </button>
        <button type="button" onClick={() => window.close()} className="laudo-toolbar-close" aria-label="Fechar">
          <X size={15} aria-hidden />
        </button>
      </div>

      <div className="laudo-sheet">
        <div className="laudo-brandbar">
          <div className="laudo-brand">
            <span className="laudo-brand-mark">
              <Activity size={20} strokeWidth={1.9} aria-hidden />
            </span>
            <span>
              <span className="laudo-brand-name">ExCenter</span>
              <span className="laudo-brand-sub">Seus exames, um só histórico</span>
            </span>
          </div>
          <div className="laudo-generated">
            Documento gerado em {generatedAt}
            {lab && (
              <>
                <br />a partir de laudo de <b>{lab}</b>
              </>
            )}
          </div>
        </div>

        <div className="laudo-headcard">
          <div className="laudo-headcard-item">
            <div className="laudo-headcard-k">Data do exame</div>
            <div className="laudo-headcard-v">{date ?? '—'}</div>
          </div>
          <div className="laudo-headcard-item">
            <div className="laudo-headcard-k">Médico solicitante</div>
            <div className="laudo-headcard-v">{exam.requestingDoctor ?? '—'}</div>
          </div>
          <div className="laudo-headcard-item">
            <div className="laudo-headcard-k">Laboratório</div>
            <div className="laudo-headcard-v">{lab ?? '—'}</div>
          </div>
          {exam.abnormalCount > 0 ? (
            <span className="laudo-badge laudo-badge-bad">
              {exam.abnormalCount} de {exam.resultCount} fora da faixa
            </span>
          ) : (
            <span className="laudo-badge laudo-badge-ok">Sem alterações</span>
          )}
        </div>

        {exam.groups.map((group) => {
          const materialMethod = [
            group.material ? `Material: ${group.material}` : null,
            group.method ? `Método: ${group.method}` : null,
          ]
            .filter(Boolean)
            .join('  ·  ');
          return (
            // Painel pequeno não quebra de página no meio; grande (hemograma) precisa poder.
            <section key={group.name} className={`laudo-panel${group.results.length > 8 ? ' laudo-panel-big' : ''}`}>
              <div className="laudo-panel-header">
                <h2>{group.name}</h2>
                {materialMethod && <span>{materialMethod}</span>}
              </div>
              {group.results.map((result) => (
                <LaudoRow key={result.resultId} result={result} showName={!group.isSingle} />
              ))}
            </section>
          );
        })}

        {highlighted.length > 0 && (
          <>
            <h2 className="laudo-highlight-title">Em destaque: evolução dos marcadores fora da faixa</h2>
            <p className="laudo-highlight-sub">
              Histórico completo no ExCenter — todos os laboratórios, no mesmo gráfico.
            </p>
            {highlighted.map((result) => (
              <div key={result.resultId} className="laudo-highlight-card">
                <h3>
                  {result.parameterName}
                  {result.unit ? ` (${result.unit})` : ''}
                </h3>
                {result.referenceValue && <p className="laudo-highlight-ref">Referência: {result.referenceValue}</p>}
                <TrendChart
                  points={result.history.map((p) => ({
                    date: new Date(p.date),
                    value: p.value,
                    referenceValue: p.referenceValue,
                    laboratoryName: p.laboratoryName,
                    requestingDoctor: p.requestingDoctor,
                  }))}
                  unit={result.unit}
                  referenceRange={resolveReferenceRange(result.referenceMin, result.referenceMax, result.referenceValue)}
                />
              </div>
            ))}
          </>
        )}

        <div className="laudo-footer">
          <span>Gerado pelo ExCenter · excenter.com.br</span>
          <span>Este documento reúne resultados extraídos de laudos originais e não substitui avaliação médica.</span>
        </div>
      </div>
    </div>
  );
}
