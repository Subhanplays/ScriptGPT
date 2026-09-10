import express from 'express';
import cors from 'cors';
import { prisma } from './src/db';
import authRoutes from './src/routes/auth';
import userRoutes from './src/routes/users';
import conversationRoutes from './src/routes/conversations';
import geminiRoutes from './src/routes/gemini';
import adminRoutes from './src/routes/admin';
import usageRoutes from './src/routes/usage';
import scriptGptRoutes from './src/routes/scriptgpt';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/scriptgpt', scriptGptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usage', usageRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
