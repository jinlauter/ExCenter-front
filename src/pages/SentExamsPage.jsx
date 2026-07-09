import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { excenterColors as colors } from '../theme.js';
import Sidebar from '../components/Sidebar.jsx';
import { getSentFiles, downloadFile } from '../api/bloodTests.js';

const FILE_NAME_MAX_LENGTH = 50;

function truncateFileName(name) {
  if (!name || name.length <= FILE_NAME_MAX_LENGTH) return name;
  return `${name.slice(0, FILE_NAME_MAX_LENGTH)}...`;
}

const STATUS_LABEL = {
  pending: 'Pendente',
  processing: 'Processando',
  done: 'Concluído',
  failed: 'Falhou',
};

const STATUS_COLOR = {
  pending: 'default',
  processing: 'info',
  done: 'success',
  failed: 'error',
};

function getStatusDisplay(file) {
  if (file.status === 'done' && file.isValidExam === false) {
    return { label: 'Não é exame de sangue', color: 'warning' };
  }
  return {
    label: STATUS_LABEL[file.status] || file.status,
    color: STATUS_COLOR[file.status] || 'default',
  };
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SentExamsPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSentFiles();
      setFiles(data);
    } catch {
      setError('Não foi possível carregar os exames enviados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDownload = async (file) => {
    setDownloadingId(file.fileId);
    try {
      await downloadFile(file.fileId, file.fileName);
    } catch {
      setError(`Não foi possível baixar "${file.fileName}". Tente novamente.`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.pageBg }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, padding: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>
              Exames enviados
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
              Acompanhe o processamento dos arquivos que você enviou.
            </Typography>
          </Box>
          <Tooltip title="Atualizar">
            <span>
              <IconButton onClick={loadFiles} disabled={loading}>
                <RefreshOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
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
        ) : files.length === 0 ? (
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
            <Typography variant="h6" sx={{ fontWeight: 500, fontSize: 16, mb: 1 }}>
              Nenhum exame enviado ainda
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', maxWidth: 480, margin: '0 auto' }}
            >
              Quando você enviar PDFs ou imagens de exames, eles aparecerão aqui com o status do
              processamento.
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              border: `0.5px solid ${colors.borderSoft}`,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>Arquivo</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>Enviado em</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>Processado em</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">
                    Download
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => {
                  const statusDisplay = getStatusDisplay(file);
                  const isInvalidExam = file.status === 'done' && file.isValidExam === false;
                  const statusReason = file.invalidReason || file.errorMessage;
                  const statusTooltip = isInvalidExam
                    ? `O sistema interpretou que este arquivo é: "${statusReason}"`
                    : statusReason;
                  return (
                    <TableRow key={file.fileId} hover>
                      <TableCell>
                        <Tooltip title={file.fileName}>
                          <Typography variant="body2" sx={{ display: 'inline-block' }}>
                            {truncateFileName(file.fileName)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            size="small"
                            label={statusDisplay.label}
                            color={statusDisplay.color}
                            variant={file.status === 'pending' ? 'outlined' : 'filled'}
                          />
                          {statusReason && (
                            <Tooltip title={statusTooltip}>
                              <InfoOutlinedIcon
                                fontSize="small"
                                sx={{
                                  color: isInvalidExam ? 'warning.main' : 'error.main',
                                  cursor: 'help',
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {formatDate(file.sentAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {formatDate(file.processedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Baixar arquivo original">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(file)}
                              disabled={downloadingId === file.fileId}
                              sx={{ color: colors.primary }}
                            >
                              {downloadingId === file.fileId ? (
                                <CircularProgress size={18} sx={{ color: colors.primary }} />
                              ) : (
                                <DownloadOutlinedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
