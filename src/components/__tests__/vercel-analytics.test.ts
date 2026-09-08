import { describe, expect, it } from 'vitest';
import { limparUrl } from '@/components/vercel-analytics';

// O Analytics reporta a URL da página, e a URL do exame compartilhado carrega o TOKEN — que é a
// credencial inteira de acesso àquele exame. Sem esta limpeza, o painel da Vercel guardaria
// endereços que qualquer pessoa com acesso a ele poderia colar no browser e abrir o exame de
// alguém. Estes testes são o que impede isso de voltar em silêncio.
describe('limpeza da URL antes de ir para o Analytics', () => {
  const TOKEN = 'kZ9x-Ab3_QwErTyUiOpAsDfGhJkLzXcVbNm1234567890';

  it('tira o token do link compartilhado', () => {
    const limpa = limparUrl(`https://www.excenter.tec.br/resultados-compartilhados/${TOKEN}`);

    expect(limpa).not.toContain(TOKEN);
    expect(limpa).toBe('https://www.excenter.tec.br/resultados-compartilhados/[token]');
  });

  it('tira o token mesmo com query string ou âncora depois', () => {
    expect(limparUrl(`/resultados-compartilhados/${TOKEN}?utm_source=whatsapp`))
      .toBe('/resultados-compartilhados/[token]?utm_source=whatsapp');
    expect(limparUrl(`/resultados-compartilhados/${TOKEN}#resultados`))
      .toBe('/resultados-compartilhados/[token]#resultados');
  });

  it('tira o id do exame das rotas autenticadas', () => {
    // Não é credencial (exige sessão), mas é identificador de registro de saúde, e ninguém
    // analisa tráfego por UUID — a métrica útil ("abriram o detalhe") sobrevive inteira.
    expect(limparUrl('/resultados/056d0163-d3ac-419a-be57-1bbf16e24ae7'))
      .toBe('/resultados/[id]');
    expect(limparUrl('/resultados/056d0163-d3ac-419a-be57-1bbf16e24ae7/imprimir'))
      .toBe('/resultados/[id]/imprimir');
  });

  it('deixa as rotas públicas intactas', () => {
    // Se a limpeza comesse a landing, o Analytics perderia justamente a página que interessa.
    expect(limparUrl('https://www.excenter.tec.br/')).toBe('https://www.excenter.tec.br/');
    expect(limparUrl('/para-medicos')).toBe('/para-medicos');
    expect(limparUrl('/login')).toBe('/login');
  });
});
