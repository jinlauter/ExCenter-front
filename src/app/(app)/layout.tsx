import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { backendFetchOrRedirect } from '@/lib/backend';
import { Sidebar } from '@/components/sidebar';
import type { UserProfileResponse } from '@/types/api';

// Layout das rotas autenticadas — busca a sessão server-side e passa o
// username pra Sidebar. Se não houver sessão (cenário raro: middleware
// já filtra), redireciona pro login.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.accessToken || !session.username) {
    redirect('/login');
  }

  // O perfil é a fonte de verdade para dados que podem mudar nas configurações.
  // router.refresh() após salvar reexecuta este layout e sincroniza a Sidebar.
  const profile = await backendFetchOrRedirect<UserProfileResponse>('/api/users/me');

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        username={profile.username}
        dateOfBirth={profile.dateOfBirth}
        avatarUpdatedAt={profile.avatarUpdatedAt}
      />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
