import { useState } from 'react';
import { useNavigate, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { excenterColors as colors } from '../theme.js';
import { useAuth } from '../auth/useAuth.js';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Se já está autenticado, manda pra home (evita ficar preso no /registrar).
  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');

    if (senha !== confirmarSenha) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, senha);
      navigate('/home', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.message;
      if (status === 429) {
        setErrorMsg('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
      } else if (status === 400 && apiMessage) {
        setErrorMsg(apiMessage);
      } else {
        setErrorMsg('Não foi possível criar a conta. Tente novamente em instantes.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.pageBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          backgroundColor: 'white',
          borderRadius: 3,
          border: `0.5px solid ${colors.border}`,
          padding: 4,
          width: '100%',
          maxWidth: 380,
        }}
      >
        <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MonitorHeartOutlinedIcon sx={{ color: colors.primary, fontSize: 26 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 500, color: colors.primaryDark, mt: 1 }}>
            ExCenter
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: colors.primarySoft, textAlign: 'center', mt: 0.5 }}
          >
            Crie sua conta
          </Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            E-mail
          </Typography>
          <TextField
            fullWidth
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            autoComplete="username"
            disabled={submitting}
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Senha
          </Typography>
          <TextField
            fullWidth
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            size="small"
            autoComplete="new-password"
            disabled={submitting}
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Confirmar senha
          </Typography>
          <TextField
            fullWidth
            type="password"
            placeholder="••••••••"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            size="small"
            autoComplete="new-password"
            disabled={submitting}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={submitting || !email || !senha || !confirmarSenha}
            sx={{
              backgroundColor: colors.primary,
              textTransform: 'none',
              fontWeight: 500,
              py: 1.25,
              mb: 2,
              '&:hover': { backgroundColor: colors.primarySoft },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Criar conta'}
          </Button>

          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Já tem conta?{' '}
            <Link
              component={RouterLink}
              to="/login"
              underline="none"
              sx={{ color: colors.primary, fontWeight: 500 }}
            >
              Entrar
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
