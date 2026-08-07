import { CardSkeleton, PageHeaderSkeleton } from '@/components/page-loading-skeleton';

// Um cartão por bloco da página real (dados pessoais, idioma, e-mail, foto, senha). Medido
// contra a tela carregada: com menos cartões o esqueleto terminava na metade da altura e o
// conteúdo dava um salto visível ao chegar.
export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <CardSkeleton className="h-52 w-full" />
      <CardSkeleton className="h-32 w-full" />
      <CardSkeleton className="h-24 w-full" />
      <CardSkeleton className="h-28 w-full" />
      <CardSkeleton className="h-48 w-full" />
    </div>
  );
}
