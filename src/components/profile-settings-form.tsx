/* eslint-disable @next/next/no-img-element -- imagem vem de rota BFF privada autenticada */
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordInput } from '@/components/ui/password-input';
import { ClearDataSection } from '@/components/clear-data-section';
import { cn } from '@/lib/utils';
import type { UserProfileResponse } from '@/types/api';

// Mesmo limite do back (UserProfileService.MaxAvatarBytes). Checar aqui evita mandar o
// arquivo pro Vercel, que rejeita corpos >4.5MB nas Serverless Functions sem devolver JSON
// — sem essa checagem local, o usuário só veria um erro genérico sem motivo.
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BIOLOGICAL_SEXES = ['Masculino', 'Feminino', 'Prefiro não informar'];

type Feedback = { type: 'success' | 'error'; message: string } | null;

// Grid dos campos DENTRO de um card. Tailwind 3 sem plugin não tem container query, então o card
// não consegue reagir à largura do PRÓPRIO container — a régua tem de ser por viewport, e ela
// alterna porque DUAS coisas roubam largura em pontos diferentes: a sidebar (aparece em `md`,
// 250px) e a divisão da página em duas colunas (`xl`). Larguras de campo medidas no navegador:
//
//   <640          1 coluna  — celular, sem sidebar
//   640–767       2 colunas — ~318px por campo
//   768–1023      1 coluna  — a sidebar entra e o main cai pra ~503px; 2 colunas dariam 179px
//   1024–1279     2 colunas — ~303px
//   1280–1535     1 coluna  — a PÁGINA vira duas colunas; 2 campos dariam ~205px
//   ≥1536         2 colunas — ~260px em 1536, ~355px em 1900
const FIELD_GRID =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2';
// Espaçador que empurra "Nova senha" pra linha de baixo: só faz sentido com o grid em 2 colunas.
// Em 1 coluna ele viraria uma linha vazia abrindo um vão extra — daí a visibilidade espelhar
// exatamente as faixas de 2 colunas do FIELD_GRID acima.
const FIELD_GRID_SPACER = 'hidden sm:block md:hidden lg:block xl:hidden 2xl:block';

function toDateInputValue(iso?: string | null) {
  return iso ? iso.slice(0, 10) : '';
}

// Sem margem própria: o empilhamento é responsabilidade da coluna que contém o card (o `gap` da
// pilha flex). Com `mb-5` aqui, o card brigaria com o gap e as duas colunas ficariam desalinhadas.
//
// `grow` é usado no ÚLTIMO card de cada coluna: as duas colunas têm a mesma altura (o grid estica),
// e é esse card que absorve a folga da coluna mais curta, para as duas terminarem na mesma linha.
function SectionCard({
  title,
  children,
  grow = false,
}: {
  title: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <Card className={cn('border-border', grow && 'grow')}>
      <CardContent className="p-6">
        <CardTitle className="mb-4">{title}</CardTitle>
        {children}
      </CardContent>
    </Card>
  );
}

// Rótulo de COLUNA (não de card): agrupa os cards de um mesmo assunto. Em uma coluna só (abaixo de
// `xl`) ele continua funcionando como o separador de seção que já existia.
function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{children}</p>
  );
}

function SectionFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <Alert variant={feedback.type === 'error' ? 'destructive' : 'success'} className="mb-4">
      <AlertDescription>{feedback.message}</AlertDescription>
    </Alert>
  );
}

async function putJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? 'Não foi possível salvar. Tente novamente.');
  }
  return res.status === 204 ? undefined : await res.json();
}

export function ProfileSettingsForm({ initialProfile }: { initialProfile: UserProfileResponse }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ---- Informações pessoais ----
  const [personalForm, setPersonalForm] = useState({
    username: profile.username,
    dateOfBirth: toDateInputValue(profile.dateOfBirth),
    bloodType: profile.bloodType ?? '',
    biologicalSex: profile.biologicalSex ?? '',
  });
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalFeedback, setPersonalFeedback] = useState<Feedback>(null);

  async function handleSavePersonalInfo() {
    setPersonalSaving(true);
    setPersonalFeedback(null);
    try {
      const updated = (await putJson('/api/users/personal-info', {
        username: personalForm.username,
        dateOfBirth: personalForm.dateOfBirth || null,
        bloodType: personalForm.bloodType || null,
        biologicalSex: personalForm.biologicalSex || null,
      })) as UserProfileResponse;
      setProfile(updated);
      setPersonalFeedback({ type: 'success', message: 'Informações pessoais atualizadas.' });
      router.refresh(); // sincroniza o username exibido na Sidebar
    } catch (err) {
      setPersonalFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setPersonalSaving(false);
    }
  }

  // ---- Senha ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  // ---- Foto de perfil ----
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<Feedback>(null);

  async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const avatar = event.target.files?.[0];
    event.target.value = '';
    if (!avatar || avatarSaving) return;

    if (avatar.size > MAX_AVATAR_BYTES) {
      setAvatarFeedback({ type: 'error', message: 'A foto deve ter no máximo 4 MB.' });
      return;
    }

    setAvatarSaving(true);
    setAvatarFeedback(null);
    const formData = new FormData();
    formData.append('avatar', avatar, avatar.name);
    try {
      const response = await fetch('/api/users/avatar', { method: 'PUT', body: formData });
      const updated = (await response.json().catch(() => null)) as
        | UserProfileResponse
        | { message?: string }
        | null;
      if (!response.ok || !updated || !('avatarUpdatedAt' in updated)) {
        const reason = updated && 'message' in updated && updated.message;
        throw new Error(reason || `Não foi possível salvar a foto (erro ${response.status}).`);
      }
      setProfile(updated);
      setAvatarFeedback({ type: 'success', message: 'Foto de perfil atualizada.' });
      router.refresh();
    } catch (err) {
      setAvatarFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    if (avatarSaving || !profile.avatarUpdatedAt) return;
    setAvatarSaving(true);
    setAvatarFeedback(null);
    try {
      const response = await fetch('/api/users/avatar', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? 'Não foi possível remover a foto.');
      }
      setProfile({ ...profile, avatarUpdatedAt: null });
      setAvatarFeedback({ type: 'success', message: 'Foto de perfil removida.' });
      router.refresh();
    } catch (err) {
      setAvatarFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleSavePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'A confirmação não bate com a nova senha.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordFeedback(null);
    try {
      await putJson('/api/users/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ type: 'success', message: 'Senha atualizada.' });
    } catch (err) {
      setPasswordFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    // Duas colunas só a partir de xl. Abaixo disso a tela continua sendo a pilha única travada em
    // max-w-2xl que sempre foi — celular e tablet não mudam nada.
    //
    // O grid ESTICA as duas colunas (sem items-start), e cada coluna é uma pilha flex cujo último
    // card tem `grow` — assim as duas terminam exatamente na mesma linha, em vez de a mais curta
    // deixar um degrau. "Limpar meus dados" fica FORA desse balanço, numa faixa de largura total
    // abaixo: é ação destrutiva, não pertence à conversa de nenhuma das duas colunas.
    <div className="max-w-2xl space-y-6 xl:max-w-none">
      <div className="grid grid-cols-1 gap-x-5 gap-y-6 xl:grid-cols-2">
        <div className="flex flex-col">
          <ColumnLabel>Informações pessoais</ColumnLabel>

          <div className="flex flex-1 flex-col gap-5">
            {/* Foto vem antes dos dados: é identidade, e ficava no fim da página, longe do Nome. */}
            <SectionCard title="Foto de perfil">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary">
                  {profile.avatarUpdatedAt ? (
                    <img
                      src={`/api/users/avatar?v=${encodeURIComponent(profile.avatarUpdatedAt)}`}
                      alt="Sua foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Personalize seu perfil</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Use uma imagem JPG, PNG ou WebP de até 4 MB.
                  </p>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelected}
                disabled={avatarSaving}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={avatarSaving}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Alterar foto'}
                </Button>
                {profile.avatarUpdatedAt && (
                  <Button variant="ghost" disabled={avatarSaving} onClick={handleRemoveAvatar}>
                    Remover foto
                  </Button>
                )}
              </div>
              <div className="mt-3">
                <SectionFeedback feedback={avatarFeedback} />
              </div>
            </SectionCard>

            <SectionCard title="Seus dados" grow>
              <div className={`mb-4 ${FIELD_GRID}`}>
                <div className="space-y-1.5">
                  <Label htmlFor="p-username">Nome</Label>
                  <Input
                    id="p-username"
                    value={personalForm.username}
                    onChange={(e) => setPersonalForm({ ...personalForm, username: e.target.value })}
                    disabled={personalSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-dob">Data de nascimento</Label>
                  <Input
                    id="p-dob"
                    type="date"
                    value={personalForm.dateOfBirth}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })
                    }
                    disabled={personalSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-bloodtype">Tipo sanguíneo</Label>
                  <Select
                    id="p-bloodtype"
                    value={personalForm.bloodType}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, bloodType: e.target.value })
                    }
                    disabled={personalSaving}
                  >
                    <option value="">Não informado</option>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-sex">Sexo biológico</Label>
                  <Select
                    id="p-sex"
                    value={personalForm.biologicalSex}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, biologicalSex: e.target.value })
                    }
                    disabled={personalSaving}
                  >
                    <option value="">Não informado</option>
                    {BIOLOGICAL_SEXES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <SectionFeedback feedback={personalFeedback} />

              <Button
                onClick={handleSavePersonalInfo}
                disabled={personalSaving || !personalForm.username.trim()}
              >
                {personalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </SectionCard>
          </div>
        </div>

        <div className="flex flex-col">
          <ColumnLabel>Configurações da conta</ColumnLabel>

          <div className="flex flex-1 flex-col gap-5">
            <SectionCard title="Email">
              <p className="text-sm text-muted-foreground">
                <strong className="font-medium text-foreground">
                  {profile.email || 'Nenhum email cadastrado'}
                </strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                O email é o identificador de acesso da sua conta e não pode ser alterado.
              </p>
            </SectionCard>

            <SectionCard title="Senha" grow>
              <div className={`mb-4 ${FIELD_GRID}`}>
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Senha atual</Label>
                  <PasswordInput
                    id="current-password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={passwordSaving}
                  />
                </div>
                <div className={FIELD_GRID_SPACER} />
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={passwordSaving}
                  />
                </div>
              </div>
              <SectionFeedback feedback={passwordFeedback} />
              <Button
                onClick={handleSavePassword}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Faixa própria, largura total, fora do balanço das colunas: ação irreversível fecha a
          página longe dos campos do dia a dia. */}
      <ClearDataSection />
    </div>
  );
}
