import { createTheme } from '@mui/material/styles';

// ============================================================================
// TEMA ExCenter — saúde wellness profissional, light mode
// ============================================================================
// Identidade visual:
// - Verde teal escuro (#0F6E56) como cor primária — passa confiança clínica
//   sem a frieza típica de hospital
// - Cinza-esverdeado bem claro como fundo de página
// - Bordas sutis de 0.5px
// - Sem sombras pesadas, sem gradientes
// - Tipografia sem-serif, pesos 400 e 500 apenas
// ============================================================================

export const excenterTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F6E56',
      dark: '#085041',
      light: '#5DCAA5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#04342C',
    },
    background: {
      default: '#F7FAF9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C2C2A',
      secondary: '#5F5E5A',
      disabled: '#888780',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 500, fontSize: 22 },
    h2: { fontWeight: 500, fontSize: 18 },
    h3: { fontWeight: 500, fontSize: 16 },
    body1: { fontSize: 14, lineHeight: 1.6 },
    body2: { fontSize: 13, lineHeight: 1.6 },
    caption: { fontSize: 12 },
    button: { fontWeight: 500, textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': {
            borderColor: '#D3D1C7',
            borderWidth: '0.5px',
          },
        },
      },
    },
  },
});

// Cores customizadas para uso direto (fora do tema)
export const excenterColors = {
  primary: '#0F6E56',
  primaryDark: '#04342C',
  primarySoft: '#085041',
  primaryLight: '#E1F5EE',
  primaryLighter: '#5DCAA5',
  pageBg: '#F7FAF9',
  border: '#D3D1C7',
  borderSoft: 'rgba(0, 0, 0, 0.08)',
};
