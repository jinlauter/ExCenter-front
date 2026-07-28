import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarShell } from '@/components/sidebar-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/resultados',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderShell(initialCollapsed = false) {
  return render(
    <SidebarShell username="Jin Hwa" dateOfBirth="1994-12-30" initialCollapsed={initialCollapsed} />,
  );
}

beforeEach(() => {
  // jsdom compartilha document.cookie entre testes.
  document.cookie = 'sidebar-collapsed=; path=/; max-age=0';
});

describe('SidebarShell — menu minimizável no desktop', () => {
  it('expandido: mostra os rótulos e o botão de minimizar', () => {
    renderShell();

    expect(screen.getByText('Exames enviados')).toBeInTheDocument();
    expect(screen.getByText('Jin Hwa')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimizar menu')).toBeInTheDocument();
  });

  it('minimizar: esconde rótulos, mantém os links acessíveis por aria-label e grava o cookie', async () => {
    renderShell();

    await userEvent.click(screen.getByLabelText('Minimizar menu'));

    // Texto some, mas cada item continua nomeado pra leitores de tela.
    expect(screen.queryByText('Exames enviados')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Exames enviados')).toHaveAttribute('href', '/exames-enviados');
    expect(screen.getByLabelText('Resultado de exames')).toBeInTheDocument();

    // Persistência: o layout (server) lê este cookie pro primeiro paint já sair minimizado.
    expect(document.cookie).toContain('sidebar-collapsed=true');
    expect(screen.getByLabelText('Expandir menu')).toBeInTheDocument();
  });

  it('expande de volta e grava o cookie como false', async () => {
    renderShell(true);

    expect(screen.queryByText('Exames enviados')).not.toBeInTheDocument(); // nasce minimizado

    await userEvent.click(screen.getByLabelText('Expandir menu'));

    expect(screen.getByText('Exames enviados')).toBeInTheDocument();
    expect(document.cookie).toContain('sidebar-collapsed=false');
  });

  it('initialCollapsed=true nasce minimizado sem clique nenhum (cookie lido no server)', () => {
    renderShell(true);

    expect(screen.getByLabelText('Expandir menu')).toBeInTheDocument();
    expect(screen.queryByText('Jin Hwa')).not.toBeInTheDocument();
  });
});
