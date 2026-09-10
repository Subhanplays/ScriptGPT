import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  let userId: string;
  try { userId = (jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const dailyUsed = await prisma.usageLog.count({ where: { userId, createdAt: { gte: today } } });
  const monthlyUsed = await prisma.usageLog.count({ where: { userId, createdAt: { gte: monthStart } } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const limits = await prisma.usageLimit.findUnique({ where: { role: (user?.role || 'USER') as any } });
  const totalUsed = await prisma.usageLog.count({ where: { userId } });
  const recentLogs = await prisma.usageLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 });

  return res.json({
    dailyUsed, dailyLimit: limits?.dailyLimit ?? 50,
    monthlyUsed, monthlyLimit: limits?.monthlyLimit ?? 1000,
    dailyRemaining: (limits?.dailyLimit ?? 50) - dailyUsed,
    monthlyRemaining: (limits?.monthlyLimit ?? 1000) - monthlyUsed,
    totalUsed, recentLogs,
  });
}
