import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

function verify(req: VercelRequest): string | null {
  const t = req.headers.authorization?.replace('Bearer ', '');
  if (!t) return null;
  try { return (jwt.verify(t, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return null; }
}

import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const userId = verify(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ id: user.id, email: user.email, username: user.username, role: user.role, geminiModel: user.geminiModel, dailyLimit: user.dailyLimit, monthlyLimit: user.monthlyLimit, createdAt: user.createdAt });
    }
    if (req.method === 'PUT') {
      const { username, email } = req.body;
      const d: any = {};
      if (username) d.username = username;
      if (email) d.email = email;
      await prisma.user.update({ where: { id: userId }, data: d });
      return res.json({ message: 'Updated' });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
