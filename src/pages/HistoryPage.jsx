import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Autocomplete,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import { excenterColors as colors } from '../theme.js';
import Sidebar from '../components/Sidebar.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { queryResults } from '../api/bloodTests.js';
import { parseReferenceRange } from '../utils/referenceRange.js';

const UNGROUPED_LABEL = 'Outros';

function formatDateLong(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isOutOfRange(value, referenceValue) {
  if (value == null) return false;
  const range = parseReferenceRange(referenceValue);
  if (!range) return false;
  if (range.min != null && value < range.min) return true;
  if (range.max != null && value > range.max) return true;
  return false;
}

export default function HistoryPage() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedParam, setSelectedParam] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    queryResults({})
      .then((data) => setResults(data))
      .catch(() => setError('Não foi possível carregar o histórico de exames. Tente novamente.'));
  }, []);

  const analysis = useMemo(() => {
    if (!results) return null;

    const exams = new Map();
    for (const r of results) {
      if (!exams.has(r.testId)) {
        exams.set(r.testId, {
          testId: r.testId,
          date: new Date(r.testDate),
          laboratoryName: r.laboratoryName,
        });
      }
    }
    const examsSorted = [...exams.values()].sort((a, b) => a.date - b.date);

    // Mesmo nome de parâmetro pode aparecer com unidades diferentes no mesmo exame
    // (ex: "Linfócitos" em % e em /μL, contagem relativa vs absoluta) — agrupar só por
    // nome misturaria as duas séries num gráfico sem sentido. A unidade faz parte da
    // identidade da série.
    //
    // Nota: groupName NÃO entra na chave — a IA às vezes marca o mesmo teste com grupo
    // num exame e sem grupo em outro (ex: "Linfócitos" veio com groupName num laudo e
    // null noutro), então usar groupName fragmentaria uma série contínua de verdade.
    // Isso deixa exposto um caso raro do lado oposto: quando o MESMO exame extrai o
    // mesmo parâmetro+unidade duas vezes com valores diferentes (ex: "Albumina" 4.9 e
    // 4.2 no mesmo laudo) — sem outro campo pra diferenciar, os dois pontos ficam na
    // mesma data. É uma inconsistência da extração, não um bug de agrupamento; resolver
    // de verdade exigiria a IA marcar essas linhas de forma distinguível na origem.
    const seriesKey = (r) => `${r.parameterName}__${r.unit ?? ''}`;

    const paramSeries = new Map();
    for (const r of results) {
      if (r.numericResultValue == null) continue;
      const key = seriesKey(r);
      if (!paramSeries.has(key)) {
        paramSeries.set(key, {
          key,
          parameterName: r.parameterName,
          unit: r.unit,
          points: [],
        });
      }
      paramSeries.get(key).points.push({
        date: new Date(r.testDate),
        value: r.numericResultValue,
        referenceValue: r.referenceValue,
      });
    }
    for (const series of paramSeries.values()) {
      series.points.sort((a, b) => a.date - b.date);
    }

    const nameOccurrences = new Map();
    for (const series of paramSeries.values()) {
      nameOccurrences.set(series.parameterName, (nameOccurrences.get(series.parameterName) ?? 0) + 1);
    }
    for (const series of paramSeries.values()) {
      series.label =
        nameOccurrences.get(series.parameterName) > 1 && series.unit
          ? `${series.parameterName} (${series.unit})`
          : series.parameterName;
    }

    const trendable = [...paramSeries.values()]
      .filter((s) => s.points.length >= 2)
      .sort((a, b) => b.points.length - a.points.length);

    const latestExam = examsSorted[examsSorted.length - 1] ?? null;
    const latestResults = latestExam
      ? results.filter((r) => r.testId === latestExam.testId)
      : [];

    const groups = new Map();
    for (const r of latestResults) {
      const key = r.groupName || UNGROUPED_LABEL;
      if (!groups.has(key)) groups.set(key, []);

      const series = paramSeries.get(seriesKey(r));
      let delta = null;
      if (r.numericResultValue != null && series) {
        const priorPoints = series.points.filter((p) => p.date < latestExam.date);
        if (priorPoints.length > 0) {
          const previous = priorPoints[priorPoints.length - 1];
          delta = r.numericResultValue - previous.value;
        }
      }

      groups.get(key).push({ ...r, delta });
    }

    const laboratories = [...new Set(examsSorted.map((e) => e.laboratoryName).filter(Boolean))];

    return { examsSorted, trendable, latestExam, groups, laboratories };
  }, [results]);

  useEffect(() => {
    if (analysis?.trendable.length && !selectedParam) {
      setSelectedParam(analysis.trendable[0].key);
    }
  }, [analysis, selectedParam]);

  const selectedSeries = analysis?.trendable.find((s) => s.key === selectedParam);
  const selectedReferenceRange = selectedSeries
    ? parseReferenceRange(selectedSeries.points[selectedSeries.points.length - 1]?.referenceValue)
    : null;

  const filteredGroups = analysis
    ? [...analysis.groups.entries()]
        .map(([groupName, items]) => [
          groupName,
          items.filter((r) => r.parameterName.toLowerCase().includes(search.trim().toLowerCase())),
        ])
        .filter(([, items]) => items.length > 0)
    : [];

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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!results && !error ? (
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
        ) : results && results.length === 0 ? (
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
              Nenhum exame processado ainda
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', maxWidth: 480, margin: '0 auto' }}
            >
              Assim que um exame de sangue for enviado e processado, seus resultados aparecem aqui.
            </Typography>
          </Paper>
        ) : (
          analysis && (
            <>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: `0.5px solid ${colors.borderSoft}`,
                    padding: 2,
                    minWidth: 160,
                  }}
                >
                  <Typography sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>
                    {analysis.examsSorted.length}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Exames processados
                  </Typography>
                </Paper>
                <Paper
                  elevation={0}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: `0.5px solid ${colors.borderSoft}`,
                    padding: 2,
                    minWidth: 220,
                  }}
                >
                  <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                    {analysis.examsSorted.length > 1
                      ? `${formatDateLong(analysis.examsSorted[0].date)} — ${formatDateLong(analysis.examsSorted[analysis.examsSorted.length - 1].date)}`
                      : formatDateLong(analysis.examsSorted[0].date)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Período coberto
                  </Typography>
                </Paper>
                {analysis.laboratories.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      backgroundColor: 'white',
                      borderRadius: 2,
                      border: `0.5px solid ${colors.borderSoft}`,
                      padding: 2,
                      minWidth: 200,
                    }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                      {analysis.laboratories.join(', ')}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      Laboratório(s)
                    </Typography>
                  </Paper>
                )}
              </Box>

              {analysis.trendable.length > 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: `0.5px solid ${colors.borderSoft}`,
                    padding: 3,
                    mb: 3,
                  }}
                >
                  <Autocomplete
                    size="small"
                    options={analysis.trendable.map((s) => s.key)}
                    getOptionLabel={(key) => analysis.trendable.find((s) => s.key === key)?.label ?? key}
                    value={selectedParam}
                    onChange={(_, value) => setSelectedParam(value)}
                    disableClearable
                    sx={{ maxWidth: 380, mb: 2 }}
                    renderInput={(params) => (
                      <TextField {...params} label="Parâmetro" placeholder="Escolha um parâmetro" />
                    )}
                  />
                  {selectedSeries && (
                    <TrendChart
                      points={selectedSeries.points}
                      unit={selectedSeries.unit}
                      referenceRange={selectedReferenceRange}
                    />
                  )}
                </Paper>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: `0.5px solid ${colors.borderSoft}`,
                    padding: 3,
                    mb: 3,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Envie mais exames com parâmetros em comum pra ver gráficos de evolução aqui.
                  </Typography>
                </Paper>
              )}

              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: 16, mb: 1.5 }}>
                Último exame ({formatDateLong(analysis.latestExam.date)})
              </Typography>

              <TextField
                placeholder="Buscar por nome do parâmetro..."
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 2, backgroundColor: 'white' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              {filteredGroups.map(([groupName, items]) => (
                <Accordion
                  key={groupName}
                  disableGutters
                  elevation={0}
                  defaultExpanded
                  sx={{
                    backgroundColor: 'white',
                    border: `0.5px solid ${colors.borderSoft}`,
                    borderRadius: '8px !important',
                    mb: 1,
                    '&::before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{groupName}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    {items.map((r) => {
                      const outOfRange = isOutOfRange(r.numericResultValue, r.referenceValue);
                      return (
                        <Box
                          key={r.resultId}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            py: 1,
                            borderTop: `0.5px solid ${colors.borderSoft}`,
                            '&:first-of-type': { borderTop: 'none' },
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                              {r.parameterName}
                            </Typography>
                            {r.referenceValue && (
                              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                Ref: {r.referenceValue}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                            {r.delta != null && Math.abs(r.delta) > 0.001 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                {r.delta > 0 ? (
                                  <ArrowUpwardOutlinedIcon sx={{ fontSize: 13 }} />
                                ) : (
                                  <ArrowDownwardOutlinedIcon sx={{ fontSize: 13 }} />
                                )}
                                <Typography sx={{ fontSize: 11 }}>
                                  {Math.abs(r.delta) < 10 ? Math.abs(r.delta).toFixed(2) : Math.abs(r.delta).toFixed(0)}
                                </Typography>
                              </Box>
                            )}
                            {outOfRange && (
                              <Chip size="small" label="Fora da faixa" color="warning" variant="outlined" />
                            )}
                            <Typography sx={{ fontSize: 14, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                              {r.numericResultValue ?? r.stringResultValue ?? '—'}
                              {r.numericResultValue != null && r.unit ? ` ${r.unit}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              ))}
            </>
          )
        )}
      </Box>
    </Box>
  );
}
