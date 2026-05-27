import { useRef, useState } from 'react';
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
import { uploadBloodTests } from '../api/bloodTests.js';

const ACCEPTED_MIME = 'application/pdf,image/jpeg,image/jpg,image/png';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message: string }

  const username = user?.username ?? '';

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
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          Olá, {username || 'usuário'}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 4 }}>
          Pronto para acompanhar sua saúde?
        </Typography>

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
            sx={{ color: 'text.secondary', maxWidth: 380, margin: '0 auto 20px' }}
          >
            Selecione um ou mais PDFs. Processamos automaticamente em segundo plano.
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
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <DescriptionOutlinedIcon sx={{ color: colors.primary, fontSize: 18 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Exames enviados</Typography>
            </Stack>
            {/* TODO: substituir pelo número real de exames do usuário. O back
                hoje não expõe um endpoint dedicado de contagem; POST
                /api/bloodtests/results/query pode ser usado, mas é overkill
                (devolve resultados completos, não só o count). Avaliar criar
                GET /api/bloodtests/count no back. */}
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Acompanhe o processamento dos seus envios
            </Typography>
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
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <ShowChartOutlinedIcon sx={{ color: colors.primary, fontSize: 18 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Histórico</Typography>
            </Stack>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Veja seus gráficos ao longo do tempo
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
