import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, proxy } from '@/proxy';

// =============================================================================
// A rota do exame compartilhado precisa continuar FORA da proteção de sessão
// =============================================================================
// `/resultados-compartilhados/{token}` só escapa dos PROTECTED_PREFIXES porque o proxy testa
//     pathname === p || pathname.startsWith(`${p}/`)
// e `/resultados-compartilhados` não casa com `/resultados` nem com `/resultados/`.
//
// Trocar aquilo por um `startsWith(p)` cru — que parece a mesma coisa e é uma "simplificação"
// plausível — passaria a redirecionar todo visitante de link compartilhado para o login, EM
// SILÊNCIO: sem erro, sem teste vermelho, e só descoberto por quem recebeu o link e não
// conseguiu abrir.
//
// Este arquivo é a rede dessa sutileza. Se ele ficar vermelho, é o recurso de compartilhamento
// que está caindo, não o teste que está errado.
// =============================================================================

const COOKIE_DE_SESSAO = 'excenter-session';

function requisicaoPara(pathname: string, { comSessao = false } = {}) {
  const request = new NextRequest(new URL(pathname, 'https://www.excenter.tec.br'));
  if (comSessao) request.cookies.set(COOKIE_DE_SESSAO, 'qualquer-coisa');
  return request;
}

/** O proxy só devolve redirect via header `location`; passar direto é NextResponse.next(). */
function destinoDoRedirect(response: Response) {
  return response.headers.get('location');
}

describe('rota pública de exame compartilhado', () => {
  const TOKEN = 'kZ9x-Ab3_QwErTyUiOpAsDfGhJkLzXcVbNm1234567890';

  it('deixa passar sem sessão', () => {
    const resposta = proxy(requisicaoPara(`/resultados-compartilhados/${TOKEN}`));

    expect(destinoDoRedirect(resposta)).toBeNull();
  });

  it('deixa passar mesmo com sessão ativa', () => {
    // Quem já é usuário do ExCenter também recebe links. Não pode ser desviado pra /home.
    const resposta = proxy(
      requisicaoPara(`/resultados-compartilhados/${TOKEN}`, { comSessao: true }),
    );

    expect(destinoDoRedirect(resposta)).toBeNull();
  });

  it('não é capturada pelo matcher de rotas estáticas nem de API', () => {
    // O matcher exclui `api`, `_next/*` e o favicon. Se um dia ele passar a excluir mais coisa
    // e pegar esta rota junto, o header `x-pathname` deixaria de ser propagado.
    const [matcher] = config.matcher;
    expect(matcher).toBeDefined();
    expect(new RegExp(matcher!.replace(/^\//, '^\\/'))
      .test(`/resultados-compartilhados/${TOKEN}`)).toBe(true);
  });

  it('a área autenticada CONTINUA protegida — o teste acima não afrouxou nada', () => {
    // Contraprova: sem isto, apagar a proteção inteira faria os dois primeiros testes passarem.
    const resposta = proxy(requisicaoPara('/resultados/056d0163-d3ac-419a-be57-1bbf16e24ae7'));

    expect(destinoDoRedirect(resposta)).toContain('/login');
  });

  it('a raiz de /resultados também continua protegida', () => {
    const resposta = proxy(requisicaoPara('/resultados'));

    expect(destinoDoRedirect(resposta)).toContain('/login');
  });
});
