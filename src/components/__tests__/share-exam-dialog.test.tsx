import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareExamDialog } from '@/components/share-exam-dialog';

// A consulta que roda ao abrir o diálogo (GET .../share) decide QUAL das telas aparece, e o
// perigo mora justamente aí: tratar uma falha como "não tem link" oferece o botão de criar a
// quem já tem um — e criar de novo derruba o link anterior, que pode já estar com outra pessoa.
// Estes testes prendem as três saídas possíveis dessa consulta.

const TEST_ID = 'abc-123';

function mockShareGet(...respostas: (() => Response)[]) {
  let chamada = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const proxima = respostas[Math.min(chamada, respostas.length - 1)]!;
      chamada += 1;
      return proxima();
    }),
  );
}

const semLink = () => new Response(null, { status: 404 });
const backForaDoAr = () =>
  new Response(JSON.stringify({ message: 'Servidor temporariamente indisponível.' }), { status: 503 });
const comLink = () =>
  new Response(
    JSON.stringify({
      createdAt: '2026-09-08T12:00:00Z',
      expiresAt: '2026-09-12T12:00:00Z',
      viewCount: 0,
      lastViewedAt: null,
      hasOriginalFile: true,
    }),
    { status: 200 },
  );

describe('ShareExamDialog — a consulta do link ativo', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('404 é resposta normal: oferece a escolha de prazo', async () => {
    mockShareGet(semLink);
    render(<ShareExamDialog testId={TEST_ID} onClose={() => {}} />);

    expect(await screen.findByRole('button', { name: /Criar link/ })).toBeInTheDocument();
  });

  it('link ativo: mostra validade e revogação, sem oferecer criar', async () => {
    mockShareGet(comLink);
    render(<ShareExamDialog testId={TEST_ID} onClose={() => {}} />);

    expect(await screen.findByText('Expira em')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revogar o link agora/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar link/ })).not.toBeInTheDocument();
  });

  // O caso que motivou a tela de falha: o back respondeu, mas não com um veredito sobre o link.
  it('falha na consulta NÃO oferece criar link — só tentar de novo, com o motivo à vista', async () => {
    mockShareGet(backForaDoAr);
    render(<ShareExamDialog testId={TEST_ID} onClose={() => {}} />);

    expect(await screen.findByText('Servidor temporariamente indisponível.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar link/ })).not.toBeInTheDocument();
  });

  it('"Tentar de novo" refaz a consulta e mostra o link que existia', async () => {
    mockShareGet(backForaDoAr, comLink);
    render(<ShareExamDialog testId={TEST_ID} onClose={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: /Tentar de novo/ }));

    expect(await screen.findByText('Expira em')).toBeInTheDocument();
    expect(screen.queryByText('Servidor temporariamente indisponível.')).not.toBeInTheDocument();
  });
});
