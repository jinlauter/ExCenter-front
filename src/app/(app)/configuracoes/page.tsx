import { backendFetch } from '@/lib/backend';
import { ProfileSettingsForm } from '@/components/profile-settings-form';
import type { UserProfileResponse } from '@/types/api';

// Configurações — server component. Busca o perfil server-side e passa como
// prop inicial pro form (client, precisa de estado por seção).
export default async function ConfiguracoesPage() {
  const profile = await backendFetch<UserProfileResponse>('/api/users/me');

  return (
    <div className="max-w-2xl space-y-1">
      <h1 className="text-2xl font-medium">Configurações</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gerencie suas informações e as preferências da sua conta.
      </p>

      <ProfileSettingsForm initialProfile={profile} />
    </div>
  );
}
