'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, Link2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExamShareSummaryResponse } from '@/types/api';

// =============================================================================
// Criar, ver e revogar o link público de um exame
// =============================================================================
// Duas telas no mesmo diálogo, decididas pelo que o back responde ao abrir:
//   - exame SEM link → escolha de prazo + "Criar link";
//   - exame COM link → validade, acessos e "Revogar".
//
// O que NÃO tem, de propósito: reexibir a URL de um link já existente. O back guarda só o hash
// do token, então a URL só existe no instante da criação — mostrar um campo vazio prometendo
// "seu link" seria mentira. Quem perdeu o endereço gera outro, e o anterior morre junto.
// =============================================================================

const PRAZOS = [
  { dias: 1, rotulo: '24 horas' },
  { dias: 4, rotulo: '4 dias' },
  { dias: 15, rotulo: '15 dias' },
  { dias: 30, rotulo: '30 dias' },
] as const;

const PRAZO_PADRAO = 4;

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ShareExamDialog({ testId, onClose }: { testId: string; onClose: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dias, setDias] = useState<number>(PRAZO_PADRAO);
  const [linkAtivo, setLinkAtivo] = useState<ExamShareSummaryResponse | null>(null);
  // Só preenchido logo após criar — ver o comentário do cabeçalho.
  const [urlRecemCriada, setUrlRecemCriada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  const carregarLinkAtivo = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/exams/${testId}/share`);
      // 404 é resposta normal: este exame simplesmente não tem link.
      setLinkAtivo(resposta.ok ? ((await resposta.json()) as ExamShareSummaryResponse) : null);
    } catch {
      setErro('Não foi possível consultar o link deste exame.');
    } finally {
      setCarregando(false);
    }
  }, [testId]);

  useEffect(() => {
    void carregarLinkAtivo();
  }, [carregarLinkAtivo]);

  async function criar() {
    setOcupado(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/exams/${testId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: dias }),
      });
      const corpo = (await resposta.json()) as { url?: string; expiresAt?: string; message?: string };

      if (!resposta.ok || !corpo.url) {
        setErro(corpo.message ?? 'Não foi possível criar o link.');
        return;
      }

      setUrlRecemCriada(corpo.url);
      await carregarLinkAtivo();
    } catch {
      setErro('Não foi possível criar o link.');
    } finally {
      setOcupado(false);
    }
  }

  async function revogar() {
    setOcupado(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/exams/${testId}/share`, { method: 'DELETE' });
      if (!resposta.ok) {
        setErro('Não foi possível revogar o link.');
        return;
      }
      setLinkAtivo(null);
      setUrlRecemCriada(null);
    } catch {
      setErro('Não foi possível revogar o link.');
    } finally {
      setOcupado(false);
    }
  }

  async function copiar() {
    if (!urlRecemCriada) return;
    try {
      await navigator.clipboard.writeText(urlRecemCriada);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (contexto não seguro, permissão negada): o campo é selecionável,
      // então o usuário ainda copia à mão — melhor que um erro que não ajuda em nada.
      setErro('Não consegui copiar sozinho. Selecione o endereço e copie.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="share-dialog-title" className="text-lg font-medium">
            Compartilhar este exame
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aviso sem eufemismo, sempre visível: o que está em jogo é um exame de sangue numa
            URL que dispensa conta. Esconder isso num tooltip seria consentimento de fachada. */}
        <div className="mb-4 flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>Qualquer pessoa com o link vê este exame</strong>, sem precisar de conta — os
            resultados, o seu nome e o laudo original do laboratório. Ele deixa de funcionar
            sozinho na data que você escolher.
          </p>
        </div>

        {carregando ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : linkAtivo ? (
          <LinkAtivo
            link={linkAtivo}
            url={urlRecemCriada}
            copiado={copiado}
            ocupado={ocupado}
            onCopiar={copiar}
            onRevogar={revogar}
          />
        ) : (
          <EscolhaDePrazo dias={dias} ocupado={ocupado} onEscolher={setDias} onCriar={criar} />
        )}

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
      </div>
    </div>
  );
}

function EscolhaDePrazo({
  dias,
  ocupado,
  onEscolher,
  onCriar,
}: {
  dias: number;
  ocupado: boolean;
  onEscolher: (dias: number) => void;
  onCriar: () => void;
}) {
  return (
    <>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">O link fica de pé por</legend>
        <div className="flex flex-wrap gap-2">
          {PRAZOS.map(({ dias: valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={dias === valor}
              onClick={() => onEscolher(valor)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm transition-colors',
                dias === valor
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      <Button onClick={onCriar} disabled={ocupado} className="mt-4 w-full">
        {ocupado ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
        Criar link
      </Button>
    </>
  );
}

function LinkAtivo({
  link,
  url,
  copiado,
  ocupado,
  onCopiar,
  onRevogar,
}: {
  link: ExamShareSummaryResponse;
  url: string | null;
  copiado: boolean;
  ocupado: boolean;
  onCopiar: () => void;
  onRevogar: () => void;
}) {
  return (
    <>
      {url ? (
        <div className="mb-4">
          <label htmlFor="share-url" className="mb-1.5 block text-sm font-medium">
            Endereço do link
          </label>
          <div className="flex gap-2">
            {/* readOnly e não disabled: campo desabilitado não deixa selecionar o texto, e
                selecionar é o plano B de quem tem a área de transferência bloqueada. */}
            <input
              id="share-url"
              readOnly
              value={url}
              onFocus={(evento) => evento.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" onClick={onCopiar} aria-label="Copiar o endereço">
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Guarde agora: por segurança, o endereço não fica salvo e não dá pra mostrar de novo.
          </p>
        </div>
      ) : (
        // Reabriu o diálogo depois. O link existe, mas a URL não pode ser reexibida.
        <p className="mb-4 rounded-lg bg-muted/40 p-3 text-[13px] text-muted-foreground">
          Este exame já tem um link ativo. Por segurança o endereço não fica guardado — se você
          perdeu, revogue e crie outro (o anterior para de funcionar na hora).
        </p>
      )}

      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Expira em</dt>
          <dd className="text-right font-medium">{formatarData(link.expiresAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Aberturas</dt>
          <dd className="text-right font-medium">
            {link.viewCount === 0
              ? 'ainda não foi aberto'
              : `${link.viewCount}${link.lastViewedAt ? ` · última em ${formatarData(link.lastViewedAt)}` : ''}`}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        variant="outline"
        onClick={onRevogar}
        disabled={ocupado}
        className="mt-4 w-full border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Revogar o link agora
      </Button>
    </>
  );
}
