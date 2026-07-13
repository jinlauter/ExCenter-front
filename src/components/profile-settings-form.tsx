'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UserProfileResponse } from '@/types/api';

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

  // ---- Email ----
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);

  async function handleSaveEmail() {
    setEmailSaving(true);
    setEmailFeedback(null);
    try {
      const updated = (await putJson('/api/users/email', {
        newEmail,
        currentPassword: emailPassword,
      })) as UserProfileResponse;
      setProfile(updated);
      setNewEmail('');
      setEmailPassword('');
      setEmailFeedback({ type: 'success', message: 'Email atualizado.' });
    } catch (err) {
      setEmailFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setEmailSaving(false);
    }
  }

  // ---- Senha ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-dob">Data de nascimento</Label>
            <Input
              id="p-dob"
              type="date"
              value={personalForm.dateOfBirth}
              onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bloodtype">Tipo sanguíneo</Label>
            <Select
              id="p-bloodtype"
              value={personalForm.bloodType}
              onChange={(e) => setPersonalForm({ ...personalForm, bloodType: e.target.value })}
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
        <p className="mb-4 text-xs text-muted-foreground">
          Email atual: <strong>{profile.email || 'nenhum cadastrado'}</strong>
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Novo email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-password">Senha atual</Label>
            <PasswordInput
              id="email-password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
            />
          </div>
        </div>
        <SectionFeedback feedback={emailFeedback} />
        <Button onClick={handleSaveEmail} disabled={emailSaving || !newEmail.trim() || !emailPassword}>
          {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
        </Button>
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
