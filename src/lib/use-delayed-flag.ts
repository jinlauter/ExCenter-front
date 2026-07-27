'use client';

import { useEffect, useState } from 'react';

/**
 * Espelha `active`, mas só liga depois de `delayMs` ligado de forma contínua. Desliga na hora.
 */
// Serve pra indicador de carregamento: uma operação que resolve em 150ms acenderia e apagaria
// o indicador antes de dar tempo de ler, e esse pisca-pisca chama mais atenção (negativa) do
// que a ausência de indicador nenhum. Só o que demora o bastante pra ser percebido como espera
// merece ser anunciado.
//
// O desligamento é imediato de propósito: atrasar também deixaria o indicador na tela depois
// de os dados já terem chegado, que é o defeito oposto.
export function useDelayedFlag(active: boolean, delayMs = 200): boolean {
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    if (!active) return;

    const timer = setTimeout(() => setDelayPassed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setDelayPassed(false);
    };
  }, [active, delayMs]);

  // O && com `active` é o que garante o desligamento imediato — sem depender do cleanup
  // ter rodado antes desta renderização.
  return active && delayPassed;
}
