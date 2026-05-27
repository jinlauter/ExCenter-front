import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
  Divider,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { excenterColors as colors } from '../theme.js';
import { useAuth } from '../auth/useAuth.js';

// Logo oficial do Google (4 cores) — mantido conforme referência.
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

// Logo oficial da Apple (preto) — mantido conforme referência.
const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#000000">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Se já está autenticado, manda pra home (evita ficar preso no /login).
  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');
    setSubmitting(true);
    try {
      // O back espera "username" — a UI mostra "E-mail" porque o produto
      // segue essa nomenclatura, mas o que vai pro back é o conteúdo do campo.
      await login(email, senha);
      const dest = location.state?.from?.pathname || '/home';
      navigate(dest, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setErrorMsg('Credenciais inválidas. Verifique e-mail e senha.');
      } else if (status === 429) {
        setErrorMsg('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
      } else {
        setErrorMsg('Não foi possível entrar. Tente novamente em instantes.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // TODO: a opção "Lembrar de mim" hoje não influencia o ciclo de vida da
  // sessão. O back já mantém refresh token de 7 dias por padrão e a duração
  // do cookie httpOnly é controlada pelo servidor. Manter o checkbox visual
  // até definirmos comportamento (ex: sessão curta vs persistente).
  const handleNotImplemented = (feature) => () => {
    console.info(`[TODO] ${feature} ainda não implementado`);
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
            Seu histórico. Seu controle.
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
            type="text"
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
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            size="small"
            autoComplete="current-password"
            disabled={submitting}
            sx={{ mb: 1 }}
          />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  sx={{ '&.Mui-checked': { color: colors.primary } }}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Lembrar de mim
                </Typography>
              }
            />
            <Link
              href="#"
              underline="none"
              onClick={(e) => {
                e.preventDefault();
                handleNotImplemented('recuperação de senha')();
              }}
              sx={{ fontSize: 12, color: colors.primary, cursor: 'pointer' }}
            >
              Esqueci minha senha
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={submitting || !email || !senha}
            sx={{
              backgroundColor: colors.primary,
              textTransform: 'none',
              fontWeight: 500,
              py: 1.25,
              mb: 2,
              '&:hover': { backgroundColor: colors.primarySoft },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Entrar'}
          </Button>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              ou continue com
            </Typography>
          </Divider>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleNotImplemented('login com Google')}
              sx={{
                textTransform: 'none',
                color: 'text.primary',
                borderColor: colors.border,
                '&:hover': { borderColor: colors.border, backgroundColor: colors.pageBg },
              }}
            >
              Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AppleIcon />}
              onClick={handleNotImplemented('login com Apple')}
              sx={{
                textTransform: 'none',
                color: 'text.primary',
                borderColor: colors.border,
                '&:hover': { borderColor: colors.border, backgroundColor: colors.pageBg },
              }}
            >
              Apple
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 3 }}>
            Novo aqui?{' '}
            <Link
              href="#"
              underline="none"
              onClick={(e) => {
                e.preventDefault();
                handleNotImplemented('cadastro de novo usuário')();
              }}
              sx={{ color: colors.primary, fontWeight: 500, cursor: 'pointer' }}
            >
              Criar conta
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
