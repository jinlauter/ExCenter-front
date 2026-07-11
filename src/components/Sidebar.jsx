import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Stack,
  Divider,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { excenterColors as colors } from '../theme.js';
import { useAuth } from '../auth/useAuth.js';

const SIDEBAR_WIDTH = 250;
const NOTCH = 16;

function NavItem({ icon, label, active, onClick }) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: active ? `${NOTCH}px 0 0 ${NOTCH}px` : 1.5,
        mb: 0.5,
        mr: active ? -2 : 0,
        position: 'relative',
        zIndex: active ? 2 : 0,
        backgroundColor: active ? colors.pageBg : 'transparent',
        color: active ? colors.primary : 'rgba(255,255,255,0.85)',
        '&:hover': {
          backgroundColor: active ? colors.pageBg : 'rgba(255,255,255,0.1)',
        },
        ...(active && {
          '&::before': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: `-${NOTCH}px`,
            width: `${NOTCH}px`,
            height: `${NOTCH}px`,
            background: `radial-gradient(circle at 0 0, ${colors.primary} ${NOTCH}px, ${colors.pageBg} ${NOTCH}px)`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            right: 0,
            bottom: `-${NOTCH}px`,
            width: `${NOTCH}px`,
            height: `${NOTCH}px`,
            background: `radial-gradient(circle at 0 100%, ${colors.primary} ${NOTCH}px, ${colors.pageBg} ${NOTCH}px)`,
          },
        }),
      }}
    >
      <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: 13,
          fontWeight: active ? 600 : 400,
        }}
      />
    </ListItemButton>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const username = user?.username ?? '';
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: 'none',
          backgroundColor: colors.primary,
          padding: 2,
        },
      }}
    >
      {/* User section */}
      <Stack alignItems="center" sx={{ mt: 1.5, mb: 2.5, px: 1 }}>
        <Avatar
          sx={{
            width: 72,
            height: 72,
            fontSize: 28,
            fontWeight: 600,
            backgroundColor: '#B5D4F4',
            color: '#0C447C',
            mb: 1.5,
          }}
        >
          {initial}
        </Avatar>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'white', mb: 0.25 }}>
          {username || '—'}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          Data de nascimento
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)' }} />

      {/* Nav items */}
      <List sx={{ flex: 1, padding: 0 }}>
        <NavItem
          icon={<HomeOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Início"
          active={location.pathname === '/home'}
          onClick={() => navigate('/home')}
        />
        <NavItem
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Exames enviados"
          active={location.pathname === '/exames-enviados'}
          onClick={() => navigate('/exames-enviados')}
        />
        <NavItem
          icon={<ShowChartOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Histórico de exames"
          active={location.pathname === '/historico'}
          onClick={() => navigate('/historico')}
        />
        <NavItem
          icon={<SettingsOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Configurações"
          active={location.pathname === '/configuracoes'}
          onClick={() => navigate('/configuracoes')}
        />
      </List>

      {/* Logo + Configurações */}
      <Box sx={{ mt: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, px: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MonitorHeartOutlinedIcon sx={{ color: colors.primary, fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontWeight: 500, fontSize: 14, color: 'white' }}>ExCenter</Typography>
        </Stack>

        <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            Sair da conta
          </Typography>
          <Tooltip title="Sair">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}
