import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { excenterColors as colors } from '../theme.js';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../auth/useAuth.js';
import {
  getProfile,
  updatePersonalInfo,
  updateLanguage,
  updateEmail,
  updatePassword,
} from '../api/users.js';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BIOLOGICAL_SEXES = ['Masculino', 'Feminino', 'Prefiro não informar'];
const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
];

function toDateInputValue(isoString) {
  if (!isoString) return '';
  return isoString.slice(0, 10);
}

function SectionCard({ title, children, sx }) {
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderRadius: 2,
        border: `0.5px solid ${colors.borderSoft}`,
        padding: 3,
        mb: 2.5,
        ...sx,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      type={visible ? 'text' : 'password'}
      size="small"
      fullWidth
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setVisible((v) => !v)} edge="end" tabIndex={-1}>
              {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

export default function ConfiguracoesPage() {
  const { updateUsername } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setLoadError('Não foi possível carregar seu perfil. Tente novamente.'));
  }, []);

  // ---- Informações pessoais ----
  const [personalForm, setPersonalForm] = useState(null);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalFeedback, setPersonalFeedback] = useState(null);

  useEffect(() => {
    if (profile) {
      setPersonalForm({
        username: profile.username,
        dateOfBirth: toDateInputValue(profile.dateOfBirth),
        bloodType: profile.bloodType ?? '',
        biologicalSex: profile.biologicalSex ?? '',
      });
    }
  }, [profile]);

  const handleSavePersonalInfo = async () => {
    setPersonalSaving(true);
    setPersonalFeedback(null);
    try {
      const updated = await updatePersonalInfo({
        username: personalForm.username,
        dateOfBirth: personalForm.dateOfBirth || null,
        bloodType: personalForm.bloodType || null,
        biologicalSex: personalForm.biologicalSex || null,
      });
      setProfile(updated);
      updateUsername(updated.username);
      setPersonalFeedback({ type: 'success', message: 'Informações pessoais atualizadas.' });
    } catch (err) {
      setPersonalFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setPersonalSaving(false);
    }
  };

  // ---- Idioma ----
  const [language, setLanguage] = useState('pt-BR');
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageFeedback, setLanguageFeedback] = useState(null);

  useEffect(() => {
    if (profile) setLanguage(profile.preferredLanguage);
  }, [profile]);

  const handleSaveLanguage = async () => {
    setLanguageSaving(true);
    setLanguageFeedback(null);
    try {
      const updated = await updateLanguage(language);
      setProfile(updated);
      setLanguageFeedback({ type: 'success', message: 'Idioma salvo.' });
    } catch (err) {
      setLanguageFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setLanguageSaving(false);
    }
  };

  // ---- Email ----
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);

  const handleSaveEmail = async () => {
    setEmailSaving(true);
    setEmailFeedback(null);
    try {
      const updated = await updateEmail(newEmail, emailPassword);
      setProfile(updated);
      setNewEmail('');
      setEmailPassword('');
      setEmailFeedback({ type: 'success', message: 'Email atualizado.' });
    } catch (err) {
      setEmailFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setEmailSaving(false);
    }
  };

  // ---- Senha ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'A confirmação não bate com a nova senha.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordFeedback(null);
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ type: 'success', message: 'Senha atualizada.' });
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.pageBg }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, padding: { xs: 3, md: 5 }, maxWidth: 720 }}>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>
          Configurações
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Gerencie suas informações e as preferências da sua conta.
        </Typography>

        {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

        {!profile && !loadError ? (
          <Paper
            elevation={0}
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              border: `0.5px solid ${colors.borderSoft}`,
              padding: 5,
              textAlign: 'center',
            }}
          >
            <CircularProgress size={28} sx={{ color: colors.primary }} />
          </Paper>
        ) : (
          profile && personalForm && (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.primary, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Informações Pessoais
              </Typography>

              <SectionCard title="Seus dados">
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <TextField
                    label="Nome"
                    size="small"
                    fullWidth
                    value={personalForm.username}
                    onChange={(e) => setPersonalForm({ ...personalForm, username: e.target.value })}
                  />
                  <TextField
                    label="Data de nascimento"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={personalForm.dateOfBirth}
                    onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
                  />
                  <TextField
                    select
                    label="Tipo sanguíneo"
                    size="small"
                    fullWidth
                    value={personalForm.bloodType}
                    onChange={(e) => setPersonalForm({ ...personalForm, bloodType: e.target.value })}
                  >
                    <MenuItem value="">Não informado</MenuItem>
                    {BLOOD_TYPES.map((bt) => (
                      <MenuItem key={bt} value={bt}>{bt}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Sexo biológico"
                    size="small"
                    fullWidth
                    value={personalForm.biologicalSex}
                    onChange={(e) => setPersonalForm({ ...personalForm, biologicalSex: e.target.value })}
                  >
                    <MenuItem value="">Não informado</MenuItem>
                    {BIOLOGICAL_SEXES.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                {personalFeedback && (
                  <Alert severity={personalFeedback.type} sx={{ mb: 2 }} onClose={() => setPersonalFeedback(null)}>
                    {personalFeedback.message}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  onClick={handleSavePersonalInfo}
                  disabled={personalSaving || !personalForm.username.trim()}
                  sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: colors.primarySoft } }}
                >
                  {personalSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Salvar'}
                </Button>
              </SectionCard>

              <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.primary, mb: 1.5, mt: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Configurações da Conta
              </Typography>

              <SectionCard title="Idioma">
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <TextField
                    select
                    size="small"
                    sx={{ minWidth: 220 }}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    onClick={handleSaveLanguage}
                    disabled={languageSaving}
                    sx={{ color: colors.primary, borderColor: colors.primary }}
                  >
                    {languageSaving ? <CircularProgress size={18} /> : 'Salvar'}
                  </Button>
                </Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
                  Por enquanto isso só salva sua preferência — a interface continua em português.
                </Typography>
                {languageFeedback && (
                  <Alert severity={languageFeedback.type} sx={{ mt: 2 }} onClose={() => setLanguageFeedback(null)}>
                    {languageFeedback.message}
                  </Alert>
                )}
              </SectionCard>

              <SectionCard title="Email">
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                  Email atual: <strong>{profile.email || 'nenhum cadastrado'}</strong>
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <TextField
                    label="Novo email"
                    type="email"
                    size="small"
                    fullWidth
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <PasswordField
                    label="Senha atual"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </Box>
                {emailFeedback && (
                  <Alert severity={emailFeedback.type} sx={{ mb: 2 }} onClose={() => setEmailFeedback(null)}>
                    {emailFeedback.message}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  onClick={handleSaveEmail}
                  disabled={emailSaving || !newEmail.trim() || !emailPassword}
                  sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: colors.primarySoft } }}
                >
                  {emailSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Salvar'}
                </Button>
              </SectionCard>

              <SectionCard title="Senha" sx={{ mb: 0 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <PasswordField
                    label="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <Box />
                  <PasswordField
                    label="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    label="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Box>
                {passwordFeedback && (
                  <Alert severity={passwordFeedback.type} sx={{ mb: 2 }} onClose={() => setPasswordFeedback(null)}>
                    {passwordFeedback.message}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  onClick={handleSavePassword}
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: colors.primarySoft } }}
                >
                  {passwordSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Salvar'}
                </Button>
              </SectionCard>
            </>
          )
        )}
      </Box>
    </Box>
  );
}
