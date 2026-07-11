import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { excenterColors as colors } from '../theme.js';
import { useAuth } from '../auth/useAuth.js';
import Sidebar from '../components/Sidebar.jsx';
import { uploadBloodTests, getSentFiles } from '../api/bloodTests.js';

const ACCEPTED_MIME = 'application/pdf,image/jpeg,image/jpg,image/png';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message: string }
  const [typedText, setTypedText] = useState('');
  const [cursorOn, setCursorOn] = useState(true);
  const [sentCount, setSentCount] = useState(null);

  const username = user?.username ?? '';

  useEffect(() => {
    let cancelled = false;
    getSentFiles()
      .then((data) => {
        if (!cancelled) setSentCount(data.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const prefixes = ['Olá, ', 'Seja bem-vindo, '];
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeout;

    const tick = () => {
      const prefix = prefixes[phraseIdx];

      if (deleting) {
        charIdx--;
        setTypedText(prefix.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          phraseIdx++;
          timeout = setTimeout(tick, 150);
          return;
        }
        timeout = setTimeout(tick, 30);
      } else {
        charIdx++;
        setTypedText(prefix.slice(0, charIdx));
        if (charIdx === prefix.length) {
          if (phraseIdx < prefixes.length - 1) {
            timeout = setTimeout(() => { deleting = true; tick(); }, 2000);
          } else {
            setTimeout(() => setCursorOn(false), 800);
          }
          return;
        }
        timeout = setTimeout(tick, 60);
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, [username]);

  const handleFileSelect = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFilesChosen = async (event) => {
    const files = Array.from(event.target.files || []);
    // Limpa o value pra permitir reescolher o mesmo arquivo depois de um erro.
    event.target.value = '';
    if (files.length === 0) return;

    setFeedback(null);
    setUploading(true);
    try {
      const result = await uploadBloodTests(files);
      setFeedback({
        type: 'success',
        message: `${result.fileCount} arquivo(s) enviado(s). O processamento ocorre em segundo plano — acompanhe em "Exames enviados".`,
      });
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setFeedback({
        type: 'error',
        message: apiMessage || 'Não foi possível enviar os exames. Tente novamente.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.pageBg }}>
      <Sidebar />

      <Box component="main" sx={{ flexGrow: 1, padding: { xs: 3, md: 5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.5, fontSize: 28 }}>
          {typedText}
          {cursorOn && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '2px',
                height: '0.85em',
                backgroundColor: 'text.primary',
                ml: '1px',
                mr: '1px',
                verticalAlign: 'text-bottom',
                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
                animation: 'blink 0.75s step-end infinite',
              }}
            />
          )}
          {username || 'usuário'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Pronto para acompanhar sua saúde?
        </Typography>

        <Paper
          elevation={0}
          sx={{
            backgroundColor: 'white',
            borderRadius: 2,
            border: `0.5px solid ${colors.borderSoft}`,
            padding: 2,
            mb: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <DescriptionOutlinedIcon sx={{ color: colors.primary, fontSize: 32, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>
              {sentCount === null ? '—' : sentCount}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Exames enviados
            </Typography>
          </Box>
        </Paper>

        {feedback && (
          <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
            {feedback.type === 'success' && (
              <>
                {' '}
                <Link
                  component="button"
                  onClick={() => navigate('/exames-enviados')}
                  sx={{ color: colors.primary, fontWeight: 500 }}
                >
                  Ver agora
                </Link>
                .
              </>
            )}
          </Alert>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          multiple
          hidden
          onChange={handleFilesChosen}
        />

        <Paper
          elevation={0}
          sx={{
            backgroundColor: 'white',
            borderRadius: 3,
            border: `1px dashed ${colors.primaryLighter}`,
            padding: 5,
            textAlign: 'center',
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              backgroundColor: colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CloudUploadOutlinedIcon sx={{ color: colors.primary, fontSize: 28 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 500, fontSize: 16, mb: 1 }}>
            Envie seus exames
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', maxWidth: 380, margin: '0 auto 20px', textAlign: 'center' }}
          >
            Selecione um ou mais PDFs.<br />Processamos automaticamente em segundo plano.
          </Typography>
          <Button
            variant="contained"
            onClick={handleFileSelect}
            disabled={uploading}
            sx={{
              backgroundColor: colors.primary,
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              '&:hover': { backgroundColor: colors.primarySoft },
            }}
          >
            {uploading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} sx={{ color: 'white' }} />
                <span>Enviando…</span>
              </Stack>
            ) : (
              'Selecionar PDFs'
            )}
          </Button>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          <Paper
            elevation={0}
            onClick={() => navigate('/exames-enviados')}
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              border: `0.5px solid ${colors.borderSoft}`,
              padding: 2,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: colors.primaryLighter },
            }}
          >
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <DescriptionOutlinedIcon sx={{ color: colors.primary, fontSize: 38, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0, lineHeight: 1.2 }}>Exames enviados</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Acompanhe o processamento dos seus envios
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            onClick={() => navigate('/historico')}
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              border: `0.5px solid ${colors.borderSoft}`,
              padding: 2,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: colors.primaryLighter },
            }}
          >
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <ShowChartOutlinedIcon sx={{ color: colors.primary, fontSize: 38, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0, lineHeight: 1.2 }}>Histórico</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Veja seus gráficos ao longo do tempo
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
