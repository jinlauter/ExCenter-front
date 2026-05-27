import { Box, Typography, Paper } from '@mui/material';
import { excenterColors as colors } from '../theme.js';
import Sidebar from '../components/Sidebar.jsx';

// ============================================================================
// Tela "Exames enviados" — PLACEHOLDER
// ============================================================================
// Esta tela está fora do escopo desta entrega (que cobre apenas login + upload).
//
// Endpoints já existentes no back que provavelmente atendem esta tela
// (PRECISAM SER REVISADOS pra confirmar contrato/comportamento):
//   - POST /api/bloodtests/results/query  (BloodTestsController.cs)
//       body: BloodTestResultFilterRequest
//       resp: BloodTestResultQueryResponse[]
//       → lista resultados, pode filtrar por parâmetro/laboratório/data/etc.
//   - GET  /api/bloodtests/batch/{batchId} (BloodTestsController.cs)
//       resp: BatchStatusResponse  (status por arquivo de um upload específico)
//       → ideal pra ver progresso de envios recentes.
//
// Falta no back para uma listagem completa "Exames enviados":
//   - Não há endpoint listando todos os BatchJob do usuário autenticado.
//   - Pra fazer essa tela funcionar bem, sugiro criar algo como
//     GET /api/bloodtests/batches?limit=…&cursor=… retornando os batches do
//     usuário em ordem decrescente.
// ============================================================================

export default function SentExamsPage() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.pageBg }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, padding: { xs: 3, md: 5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>
          Exames enviados
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Acompanhe o processamento dos PDFs que você enviou.
        </Typography>

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
            Em construção
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', maxWidth: 480, margin: '0 auto' }}
          >
            Esta tela ainda não foi implementada. Quando o contrato com o back for confirmado
            (endpoint para listar batches do usuário), exibiremos aqui os envios recentes com o
            status de cada arquivo.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
