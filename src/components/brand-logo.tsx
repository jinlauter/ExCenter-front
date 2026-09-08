import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// A marca do ExCenter, em um lugar só
// =============================================================================
//
// Antes deste componente a marca estava copiada em quatro lugares (topo e rodapé da landing,
// nav de /para-medicos e a tela de login), cada um com um tamanho e uma variação própria — e
// a de /para-medicos nem tinha o quadrado, era o ícone solto. Mudar a marca exigia caçar as
// cópias, que é como elas divergiram.
//
// Duas variantes: SEM assinatura (símbolo + nome) e COM. A assinatura é opcional de propósito
// — em barra fixa e compacta ela pesa, e quem escolhe é quem usa.
//
// O DESENHO da versão com assinatura (definido pelo dono em 08/09/2026): símbolo e nome na
// mesma linha; a assinatura numa linha só embaixo, começando na borda esquerda do SÍMBOLO e
// terminando onde o nome termina. Ou seja, ela ocupa a largura do bloco inteiro — não é um
// subtítulo indentado sob o nome.
//
// É isso que explica o `w-full` e o tamanho miúdo da assinatura: ela precisa caber na largura
// de "[símbolo] ExCenter", que é curta. Por isso também ela é caixa-baixa e sem tracking
// aberto — versalete espaçado ficaria largo demais e estouraria o bloco.
// =============================================================================

// Proporções da marca. O nome fica em ~0,72 da altura do símbolo: chegamos aqui testando na
// tela em 08/09/2026 — igualar nome e símbolo (32/32) fazia as letras engolirem o quadrado, e
// o original (18/32) deixava o nome apagado ao lado dele.
//
// A entrelinha vai JUNTO do corpo, na forma `text-[24px]/[1]`, e não numa classe `leading-none`
// separada — o `cn()` usa tailwind-merge, que trata corpo e entrelinha como o mesmo grupo e
// descarta a classe anterior. Escrito separado, o `leading-none` sumia e a altura da linha
// virava 1,5em sem ninguém perceber.
//
// O corpo da assinatura é calibrado para ela caber na largura de "[símbolo] ExCenter" e parar
// um pouco antes do fim — medido na tela em 08/09/2026. Mexeu no corpo do nome ou no texto da
// assinatura, confira de novo: o alinhamento é por medida, não por regra automática.
const SIZES = {
  sm: { box: 'h-6 w-6 rounded-md', icon: 'h-3.5 w-3.5', name: 'text-[18px]/[1]', tagline: 'text-[7.6px]/[1]' },
  md: { box: 'h-8 w-8 rounded-lg', icon: 'h-5 w-5', name: 'text-[24px]/[1]', tagline: 'text-[10.1px]/[1]' },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6', name: 'text-[34px]/[1]', tagline: 'text-[14.3px]/[1]' },
} as const;

export type BrandLogoSize = keyof typeof SIZES;

interface BrandLogoProps {
  size?: BrandLogoSize;
  /** Mostra a assinatura "Seus exames, um histórico" sob o bloco símbolo + nome. */
  withTagline?: boolean;
  /** Empilha símbolo e nome na vertical, centralizados (usado na tela de login). */
  stacked?: boolean;
  /**
   * Classes extras só na assinatura. Existe por um caso concreto: no header FIXO da landing
   * ela entra com `max-sm:hidden`, porque no celular aquele cabeçalho já ocupa 186px de uma
   * tela de 812 e não pode crescer. Onde o cabeçalho não gruda (rodapé), ela fica em qualquer
   * largura.
   */
  taglineClassName?: string;
  className?: string;
}

const TAGLINE = 'Seus exames, um só histórico';

export function BrandLogo({
  size = 'md',
  withTagline = false,
  stacked = false,
  taglineClassName,
  className,
}: BrandLogoProps) {
  const s = SIZES[size];

  const mark = (
    <span className={cn('grid shrink-0 place-items-center bg-primary-light', s.box)}>
      <Activity className={cn('text-primary', s.icon)} strokeWidth={1.9} aria-hidden="true" />
    </span>
  );

  if (stacked) {
    return (
      <span className={cn('flex flex-col items-center gap-2 text-center font-semibold', className)}>
        {mark}
        <span className={s.name}>ExCenter</span>
      </span>
    );
  }

  return (
    // inline-flex: o bloco encolhe até a largura do seu conteúdo, e é essa largura que a
    // assinatura preenche com w-full. Com `flex` puro ele esticaria no container e a
    // assinatura terminaria bem depois do fim do nome.
    <span className={cn('inline-flex flex-col font-semibold', className)}>
      <span className="flex items-center gap-2">
        {mark}
        <span className={s.name}>ExCenter</span>
      </span>

      {withTagline && (
        <span
          className={cn(
            // Espaçamento natural, sem justificar. Chegamos a justificar a linha para ela
            // terminar cravada no fim de "ExCenter", e o dono vetou: os espaços esticados
            // ficaram visíveis e a assinatura perdeu o ar de texto. Terminar alguns pixels
            // antes é o comportamento aceito.
            //
            // whitespace-nowrap: uma linha só, como pedido — sem isso a assinatura quebraria,
            // justamente porque o bloco é estreito.
            'mt-1 w-full whitespace-nowrap font-normal text-muted-foreground',
            s.tagline,
            taglineClassName,
          )}
        >
          {TAGLINE}
        </span>
      )}
    </span>
  );
}
