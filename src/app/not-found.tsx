import type { Metadata } from 'next';

// O 404 global e ÚNICO do app. Existe explicitamente (em vez do default do Next) por uma razão
// de segurança: URL inexistente e notFound() disparado por página precisam renderizar O MESMO
// componente com os MESMOS metadados — qualquer diferença (título da aba, markup) vira oráculo
// pra descobrir rotas cuja existência é segredo. Medido em dev: sem este arquivo, os dois
// caminhos produziam <title> diferentes.
export const metadata: Metadata = {
  title: '404: This page could not be found.',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-5">
        <h1 className="border-r border-border pr-5 text-2xl font-medium">404</h1>
        <p className="text-sm text-muted-foreground">This page could not be found.</p>
      </div>
    </main>
  );
}
