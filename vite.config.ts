import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /** Абсолютный base — иначе при F5 на /panel браузер грузит чанки с неверного пути (белый экран). */
  base: '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    /** Пустой VITE_API_URL в dev → fetch('/admin/...') уходит сюда и проксируется на бэкенд (без CORS). */
    proxy: {
      '/admin': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
