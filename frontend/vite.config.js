import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Backend default port is 5050 (5000 pe aksar doosri apps reh jaati hain).
      // PORT change karo to yahan bhi target update karo.
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
      // Socket.IO real-time — browser same-origin pe connect hota hai, isliye
      // websocket bhi proxy karna zaroori hai (ws: true).
      '/socket.io': { target: 'http://localhost:5050', changeOrigin: true, ws: true },
    },
  },
});
