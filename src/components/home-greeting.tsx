'use client';

import { useEffect, useState } from 'react';

// Efeito de "digitação" na saudação: escreve "Olá, ", apaga, escreve
// "Seja bem-vindo(a), " e para. Flexiona pelo sexo biológico do perfil —
// "Feminino" → "bem-vinda"; qualquer outro valor (ou não informado) → "bem-vindo".
export function HomeGreeting({
  username,
  biologicalSex,
}: {
  username: string;
  biologicalSex?: string | null;
}) {
  const [typedText, setTypedText] = useState('');
  const welcome = biologicalSex?.toLowerCase() === 'feminino' ? 'Seja bem-vinda, ' : 'Seja bem-vindo, ';

  useEffect(() => {
    const prefixes = ['Olá, ', welcome];
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const prefix = prefixes[phraseIdx]!;

      if (deleting) {
        charIdx--;
        setTypedText(prefix.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          phraseIdx++;
          timeout = setTimeout(tick, 150);
          return;
        }
        timeout = setTimeout(tick, 30);
      } else {
        charIdx++;
        setTypedText(prefix.slice(0, charIdx));
        if (charIdx === prefix.length) {
          if (phraseIdx < prefixes.length - 1) {
            timeout = setTimeout(() => {
              deleting = true;
              tick();
            }, 2000);
          }
          return;
        }
        timeout = setTimeout(tick, 60);
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, [welcome]);

  return (
    <h1 className="text-[28px] font-medium">
      {typedText}
      {username}
    </h1>
  );
}
