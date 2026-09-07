import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import env from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/sockets/index.js';
import { seedIfEmpty } from './src/seeds/demoSeed.js';

const server = http.createServer(app);
initSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${env.PORT} is already in use — close the other app using it, or change PORT in backend/.env.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

connectDB()
  .then(async () => {
    await seedIfEmpty();
    server.listen(env.PORT, () => {
      console.log(`✅ Business Messaging CRM API running → http://localhost:${env.PORT}`);
      console.log(`   Demo mode: ${env.DEMO_MODE ? 'ENABLED' : 'disabled'} | Env: ${env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received — shutting down.`);
    server.close(() => process.exit(0));
  });
}
