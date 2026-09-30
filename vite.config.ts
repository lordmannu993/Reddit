import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: 'wss' },
  },
  build: {
    target: ['es2018', 'chrome70', 'safari12'],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
