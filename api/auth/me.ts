import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const dailyUsed = await prisma.usageLog.count({ where: { userId: user.id, createdAt: { gte: today } } });
    const monthlyUsed = await prisma.usageLog.count({ where: { userId: user.id, createdAt: { gte: monthStart } } });
    const limits = await prisma.usageLimit.findUnique({ where: { role: user.role as any } });
    return res.json({
      user: { id: user.id, email: user.email, username: user.username, role: user.role, geminiModel: user.geminiModel },
      usage: { dailyUsed, dailyLimit: limits?.dailyLimit ?? 50, monthlyUsed, monthlyLimit: limits?.monthlyLimit ?? 1000, dailyRemaining: (limits?.dailyLimit ?? 50) - dailyUsed, monthlyRemaining: (limits?.monthlyLimit ?? 1000) - monthlyUsed },
    });
  } catch (error: any) {
    console.error('Me error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
