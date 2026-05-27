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
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { excenterColors as colors } from '../theme.js';
import { useAuth } from '../auth/useAuth.js';

const SIDEBAR_WIDTH = 220;

function NavItem({ icon, label, active, onClick }) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: 1.5,
        mb: 0.5,
        backgroundColor: active ? colors.primaryLight : 'transparent',
        color: active ? colors.primary : 'text.secondary',
        '&:hover': {
          backgroundColor: active ? colors.primaryLight : colors.pageBg,
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: 13,
          fontWeight: active ? 500 : 400,
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
  // Primeira letra do username para o avatar (back não tem display name).
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
          borderRight: `0.5px solid ${colors.borderSoft}`,
          backgroundColor: 'white',
          padding: 2,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4, px: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MonitorHeartOutlinedIcon sx={{ color: 'white', fontSize: 16 }} />
        </Box>
        <Typography sx={{ fontWeight: 500, fontSize: 14 }}>ExCenter</Typography>
      </Stack>

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
      </List>

      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ mb: 1.5 }} />
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1 }}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: '#B5D4F4',
              color: '#0C447C',
            }}
          >
            {initial}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {username || '—'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Conta pessoal</Typography>
          </Box>
          <Tooltip title="Sair">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
              <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}
