import { backendFetchOrRedirect } from '@/lib/backend';
import { ProfileSettingsForm } from '@/components/profile-settings-form';
import type { UserProfileResponse } from '@/types/api';

// Configurações — server component. Busca o perfil server-side e passa como
// prop inicial pro form (client, precisa de estado por seção).
export default async function ConfiguracoesPage() {
  const profile = await backendFetchOrRedirect<UserProfileResponse>('/api/users/me');

  return (
    // Sem max-w aqui: quem decide a largura é o form, que abaixo de xl se trava em max-w-2xl
    // (comportamento de sempre) e a partir daí abre em duas colunas. A ClearDataSection passou a
    // ser renderizada por ele, no fim da coluna da direita.
    <div className="space-y-1">
      <h1 className="text-2xl font-medium">Configurações</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gerencie suas informações e as preferências da sua conta.
      </p>

      <ProfileSettingsForm initialProfile={profile} />
    </div>
  );
}
