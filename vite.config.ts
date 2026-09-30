import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: 'wss' },
    proxy: {
      // Dev-only passthrough so local `npm run dev` can read Reddit without CORS.
      // In production the app falls back to public read-only mirrors.
      '/reddit-json': {
        target: 'https://www.reddit.com',
        changeOrigin: true,
        secure: true,
        timeout: 8000,
        rewrite: path => path.replace(/^\/reddit-json/, ''),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fora-simulation/1.0)' },
      },
    },
  },
  build: {
    target: ['es2018', 'chrome70', 'safari12'],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
