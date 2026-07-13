'use client';

import { useEffect, useState } from 'react';

// Efeito de "digitação" na saudação: escreve "Olá, ", apaga, escreve
// "Seja bem-vindo, " e para (cursor pisca até a 2ª frase terminar).
export function HomeGreeting({ username }: { username: string }) {
  const [typedText, setTypedText] = useState('');
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const prefixes = ['Olá, ', 'Seja bem-vindo, '];
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
          } else {
            setTimeout(() => setCursorOn(false), 800);
          }
          return;
        }
        timeout = setTimeout(tick, 60);
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <h1 className="text-[28px] font-medium">
      {typedText}
      {cursorOn && (
        <span className="mx-px inline-block h-[0.85em] w-[2px] animate-pulse-blink bg-foreground align-text-bottom" />
      )}
      {username}
    </h1>
  );
}
