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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dbUrl: process.env.DATABASE_URL ? 'set' : 'missing' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/scriptgpt', scriptGptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usage', usageRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const handler = async (req: any, res: any) => {
  try {
    return await app(req, res);
  } catch (err: any) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.message });
  }
};

export default handler;
