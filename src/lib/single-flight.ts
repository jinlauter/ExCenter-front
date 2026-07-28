// Deduplicação de chamadas assíncronas por chave, ATRAVÉS de requests concorrentes — e por
// uma janela curta depois de resolver.
//
// Existe por causa da renovação de sessão: o refresh token do back é de USO ÚNICO
// (rotacionado a cada renovação). Dois requests concorrentes com o access token vencido
// tentavam renovar com o MESMO token antigo — o primeiro rotacionava, o segundo levava 401 e
// o código destruía uma sessão perfeitamente válida. O React cache() não resolve isso: ele
// deduplica DENTRO de um request, e a corrida é ENTRE requests.
//
// A retenção pós-resolução (retainMs) cobre o retardatário que chega logo DEPOIS da
// renovação terminar, ainda segurando o token antigo como chave — ele reaproveita o
// resultado em vez de queimar um token já rotacionado.
//
// Contrato: fn NUNCA deve rejeitar (devolva um objeto de resultado com o erro dentro) — uma
// promise rejeitada ficaria retida por retainMs e contaminaria os retardatários.
export function singleFlight<T>(
  inflight: Map<string, Promise<T>>,
  key: string,
  fn: () => Promise<T>,
  retainMs = 10_000,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fn().finally(() => {
    setTimeout(() => inflight.delete(key), retainMs);
  });

  inflight.set(key, promise);
  return promise;
}
