/* eslint-disable @next/next/no-img-element -- imagem vem de rota BFF privada autenticada */
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UserProfileResponse } from '@/types/api';

// Mesmo limite do back (UserProfileService.MaxAvatarBytes). Checar aqui evita mandar o
// arquivo pro Vercel, que rejeita corpos >4.5MB nas Serverless Functions sem devolver JSON
// — sem essa checagem local, o usuário só veria um erro genérico sem motivo.
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BIOLOGICAL_SEXES = ['Masculino', 'Feminino', 'Prefiro não informar'];
const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
];

type Feedback = { type: 'success' | 'error'; message: string } | null;

function toDateInputValue(iso?: string | null) {
  return iso ? iso.slice(0, 10) : '';
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-5 border-border">
      <CardContent className="p-6">
        <CardTitle className="mb-4">{title}</CardTitle>
        {children}
      </CardContent>
    </Card>
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

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className="pr-9" {...props} />
      <button
        type="button"
        tabIndex={-1}
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
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

  // ---- Idioma ----
  const [language, setLanguage] = useState(profile.preferredLanguage);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageFeedback, setLanguageFeedback] = useState<Feedback>(null);

  async function handleSaveLanguage() {
    setLanguageSaving(true);
    setLanguageFeedback(null);
    try {
      const updated = (await putJson('/api/users/language', {
        preferredLanguage: language,
      })) as UserProfileResponse;
      setProfile(updated);
      setLanguageFeedback({ type: 'success', message: 'Idioma salvo.' });
    } catch (err) {
      setLanguageFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLanguageSaving(false);
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
      const updated = (await response.json().catch(() => null)) as UserProfileResponse | { message?: string } | null;
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
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
        Informações pessoais
      </p>

      <SectionCard title="Seus dados">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
              disabled={personalSaving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bloodtype">Tipo sanguíneo</Label>
            <Select
              id="p-bloodtype"
              value={personalForm.bloodType}
              onChange={(e) => setPersonalForm({ ...personalForm, bloodType: e.target.value })}
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
              onChange={(e) => setPersonalForm({ ...personalForm, biologicalSex: e.target.value })}
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

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-primary">
        Configurações da conta
      </p>

      <SectionCard title="Idioma">
        <div className="mb-1 flex flex-wrap items-start gap-2">
          <Select
            className="max-w-[220px]"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={languageSaving}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={handleSaveLanguage} disabled={languageSaving}>
            {languageSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Por enquanto isso só salva sua preferência — a interface continua em português.
        </p>
        <SectionFeedback feedback={languageFeedback} />
      </SectionCard>

      <SectionCard title="Email">
        <p className="text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">{profile.email || 'Nenhum email cadastrado'}</strong>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          O email é o identificador de acesso da sua conta e não pode ser alterado.
        </p>
      </SectionCard>

      <SectionCard title="Foto de perfil">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary">
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

      <SectionCard title="Senha">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div />
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
  );
}
