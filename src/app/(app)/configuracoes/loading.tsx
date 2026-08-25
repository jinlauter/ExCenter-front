import { CardSkeleton, PageHeaderSkeleton } from '@/components/page-loading-skeleton';

// Espelha a página real: a partir de xl ela vira duas colunas — foto + dados à esquerda, e-mail +
// senha à direita — com a faixa de "limpar meus dados" em largura total embaixo. Abaixo de xl tudo
// empilha, e o esqueleto acompanha pelo mesmo grid. Alturas medidas contra a tela carregada: com
// menos cartões o esqueleto terminava antes do conteúdo e a página dava um salto visível.
export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6 xl:max-w-none">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-x-5 gap-y-6 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          <CardSkeleton className="h-48 w-full" />
          <CardSkeleton className="h-72 w-full" />
        </div>
        <div className="flex flex-col gap-5">
          <CardSkeleton className="h-28 w-full" />
          <CardSkeleton className="h-72 w-full" />
        </div>
      </div>
      <CardSkeleton className="h-40 w-full" />
    </div>
  );
}
