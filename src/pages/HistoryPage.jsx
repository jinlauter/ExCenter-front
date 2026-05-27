import { Box, Typography, Paper } from '@mui/material';
import { excenterColors as colors } from '../theme.js';
import Sidebar from '../components/Sidebar.jsx';

// ============================================================================
// Tela "Histórico de exames" — PLACEHOLDER
// ============================================================================
// Esta tela está fora do escopo desta entrega.
//
// Endpoint existente que parece atender (PRECISA SER REVISADO):
//   - POST /api/bloodtests/results/query (BloodTestsController.cs)
//       body: BloodTestResultFilterRequest { ParameterName?, GroupName?,
//                                            LaboratoryName?, IsAbnormal?,
//                                            FromDate?, MinValue?, MaxValue? }
//       resp: BloodTestResultQueryResponse[] (já vem com TestDate e
//             NumericResultValue — base pra montar séries temporais por
//             parâmetro)
//
// Próximos passos sugeridos quando esta tela entrar:
//   1. Listar parâmetros disponíveis do usuário (precisa de endpoint ou
//      derivar de uma query inicial)
//   2. Permitir o usuário escolher 1+ parâmetros pra plotar
//   3. Renderizar gráfico de linhas com TestDate no eixo X e NumericResultValue
//      no eixo Y, marcando faixa de referência
// ============================================================================

export default function HistoryPage() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.pageBg }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, padding: { xs: 3, md: 5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>
          Histórico de exames
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Visualize a evolução dos seus parâmetros ao longo do tempo.
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
            Em breve, gráficos com a evolução dos seus parâmetros ao longo do tempo. A base de dados
            (POST /api/bloodtests/results/query) já está disponível no back — falta o desenho da UX
            de comparação.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
