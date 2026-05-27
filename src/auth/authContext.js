import { createContext } from 'react';

// Constante isolada em arquivo próprio para que AuthProvider.jsx exporte
// apenas componentes — exigência da regra react-refresh/only-export-components.
export const AuthContext = createContext(null);
