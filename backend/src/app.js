import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ success: true, message: 'API healthy', demoMode: env.DEMO_MODE }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
