import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Toda página autenticada é um server component que busca no back com cache: 'no-store'.
// No App Router, uma rota dinâmica SEM loading.tsx bloqueia a navegação inteira: a tela
// anterior fica congelada até o render no servidor terminar, e o <Link> não tem casca
// estática pra pré-buscar. O sintoma é o app parecer lento sem que servidor nenhum esteja.
// Este teste existe pra que uma página nova não volte a nascer sem esse limite.

const AUTHENTICATED_AREA = join(process.cwd(), 'src', 'app', '(app)');

function findDirectoriesContainingAPage(directory: string): string[] {
  const entries = readdirSync(directory);
  const directoriesWithPage = entries.includes('page.tsx') ? [directory] : [];

  const subdirectories = entries
    .map((entry) => join(directory, entry))
    .filter((path) => statSync(path).isDirectory());

  return subdirectories.reduce<string[]>(
    (found, subdirectory) => [...found, ...findDirectoriesContainingAPage(subdirectory)],
    directoriesWithPage,
  );
}

describe('limites de carregamento das rotas autenticadas', () => {
  const routeDirectories = findDirectoriesContainingAPage(AUTHENTICATED_AREA);

  it('encontra as rotas da área autenticada', () => {
    expect(routeDirectories.length).toBeGreaterThan(0);
  });

  it.each(routeDirectories)('%s tem loading.tsx ao lado da page.tsx', (routeDirectory) => {
    expect(readdirSync(routeDirectory)).toContain('loading.tsx');
  });
});
