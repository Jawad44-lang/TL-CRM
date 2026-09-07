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
});
