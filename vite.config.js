import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Porta 5173 (padrão Vite) já está na allowlist de CORS do back (appsettings.json).
// Se mudar a porta aqui, lembrar de adicionar no back em Cors:AllowedOrigins.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
