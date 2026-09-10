import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import geminiRoutes from './routes/gemini';
import adminRoutes from './routes/admin';
import usageRoutes from './routes/usage';
import scriptGptRoutes from './routes/scriptgpt';

export const prisma = new PrismaClient();

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
