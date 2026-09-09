import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Backend default port is 5050 (port 5000 is often taken by other apps).
      // If you change PORT, update both proxy targets here too.
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
      // Socket.IO real-time — the browser connects same-origin, so the
      // websocket must be proxied as well (ws: true).
      '/socket.io': { target: 'http://localhost:5050', changeOrigin: true, ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /* Split the single ~500 kB bundle into cacheable vendor chunks.
           (Fixes the "chunks larger than 500 kB" warning in the terminal.)
           NOTE: '@phosphor-icons/react' and 'react-router-dom' both contain
           the string "react", so they are matched BEFORE the react bucket. */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@phosphor-icons')) return 'icons';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('socket.io-client') || id.includes('engine.io') || id.includes('engine.io-parser')) return 'realtime';
          if (id.includes('axios')) return 'http';
          return 'vendor';
        },
      },
    },
  },
});
