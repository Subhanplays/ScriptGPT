import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const slug = (req.query.slug as string[]) || [];
  const sub = slug[0] || '';

  try {
    if (req.method === 'POST' && sub === 'register') {
      const { email, username, password } = req.body;
      if (!email || !username || !password) return res.status(400).json({ error: 'Email, username, and password are required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
      if (existing) return res.status(409).json({ error: 'Email or username already exists' });
      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({ data: { email, username, password: hashed } });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      return res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
    }

    if (req.method === 'POST' && sub === 'login') {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
    }

    if (req.method === 'GET' && sub === 'me') {
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
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
