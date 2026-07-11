import { useEffect, useState, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  me,
  tryRestoreSession,
} from '../api/auth.js';
import { AuthContext } from './authContext.js';

// ============================================================================
// AuthProvider
// ============================================================================
// Estado de autenticação global. No mount, tenta restaurar a sessão usando o
// cookie refresh_token (sobrevive ao reload). Se conseguir, busca /me pra ter
// os dados do usuário. Se falhar, deixa user = null e o ProtectedRoute manda
// pro /login.
// ============================================================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { userId, username } | null
  const [loading, setLoading] = useState(true);

  // Boot: tenta resgatar sessão via cookie refresh_token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await tryRestoreSession();
      if (cancelled) return;
      if (restored) {
        try {
          const data = await me();
          if (!cancelled) setUser(data);
        } catch {
          if (!cancelled) setUser(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    await apiLogin(username, password);
    const data = await me();
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    await apiRegister(email, password);
    const data = await me();
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  // Atualiza só o username no contexto (ex: depois de editar o perfil em
  // Configurações), pra refletir em qualquer lugar que leia daqui (ex: Sidebar).
  // NÃO reconsulta GET /api/auth/me pra isso — esse endpoint devolve o username
  // cravado nas claims do JWT emitido no login, não uma leitura fresca do banco,
  // então continuaria mostrando o nome antigo até a sessão ser renovada.
  const updateUsername = useCallback((username) => {
    setUser((prev) => (prev ? { ...prev, username } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
}
