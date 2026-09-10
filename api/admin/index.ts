import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

function verifyAdmin(req: VercelRequest): string | null {
  const t = req.headers.authorization?.replace('Bearer ', '');
  if (!t) return null;
  try { return (jwt.verify(t, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return null; }
}

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === 'ADMIN';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = verifyAdmin(req);
  if (!userId || !(await isAdmin(userId))) return res.status(403).json({ error: 'Admin access required' });

  let body: any = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch { body = {}; }
  }

  const id = req.query.id as string | undefined;
  const sub = req.query.sub as string | undefined;

  try {
    if (req.method === 'GET' && !id) {
      const totalUsers = await prisma.user.count();
      const totalConversations = await prisma.conversation.count({ where: { status: 'ACTIVE' } });
      const totalMessages = await prisma.message.count();
      const totalUsage = await prisma.usageLog.count();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      const dailyUsage = await prisma.usageLog.count({ where: { createdAt: { gte: today } } });
      const weeklyUsage = await prisma.usageLog.count({ where: { createdAt: { gte: weekAgo } } });
      const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, username: true, role: true, createdAt: true } });
      const usageByProvider = await prisma.usageLog.groupBy({ by: ['aiProvider'], _count: true });
      return res.json({ totalUsers, totalConversations, totalMessages, totalUsage, dailyUsage, weeklyUsage, recentUsers, usageByProvider });
    }

    if (req.method === 'GET' && sub === 'users') {
      const users = await prisma.user.findMany({ select: { id: true, email: true, username: true, role: true, dailyLimit: true, monthlyLimit: true, createdAt: true, _count: { select: { conversations: true, usageLogs: true } } }, orderBy: { createdAt: 'desc' } });
      return res.json(users);
    }

    if (req.method === 'POST' && sub === 'create-user') {
      const { email, username, password, role, dailyLimit, monthlyLimit } = body;
      if (!email || !username || !password) return res.status(400).json({ error: 'Email, username, and password are required' });
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
      if (existing) return res.status(409).json({ error: 'Email or username already exists' });
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({ data: { email, username, password: hashed, role: role || 'USER', dailyLimit: dailyLimit || 50, monthlyLimit: monthlyLimit || 1000 } });
      return res.status(201).json({ id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role });
    }

    if (req.method === 'GET' && sub === 'limits') {
      const limits = await prisma.usageLimit.findMany();
      return res.json(limits);
    }

    if (req.method === 'GET' && sub === 'conversations') {
      const convs = await prisma.conversation.findMany({ orderBy: { updatedAt: 'desc' }, take: 100, include: { user: { select: { id: true, username: true, email: true } }, _count: { select: { messages: true } } } });
      return res.json(convs);
    }

    if (req.method === 'GET' && sub === 'usage') {
      const logs = await prisma.usageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { id: true, username: true, email: true } } } });
      return res.json(logs);
    }

    if (req.method === 'GET' && sub === 'logs') {
      const logs = await prisma.systemLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
      return res.json(logs);
    }

    if (req.method === 'GET' && sub === 'settings') {
      const settings = await prisma.systemSetting.findMany();
      const obj: Record<string, string> = {}; settings.forEach(s => { obj[s.key] = s.value; });
      return res.json(obj);
    }

    if (req.method === 'PUT' && sub === 'settings') {
      for (const [key, value] of Object.entries(body)) {
        await prisma.systemSetting.upsert({ where: { key }, update: { value: value as string, updatedBy: userId }, create: { key, value: value as string, updatedBy: userId } });
      }
      return res.json({ message: 'Settings updated' });
    }

    if (req.method === 'GET' && sub === 'gemini-status') {
      const usersWithKeys = await prisma.user.count({ where: { geminiApiKey: { not: null } } });
      return res.json({ scriptgptConfigured: !!process.env.ADMIN_GEMINI_KEY, usersWithGeminiKeys: usersWithKeys });
    }

    if (id && sub === 'role' && req.method === 'PUT') {
      const { role } = body;
      if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      await prisma.user.update({ where: { id }, data: { role } });
      return res.json({ message: 'Role updated' });
    }

    if (id && sub === 'limits' && req.method === 'PUT') {
      await prisma.user.update({ where: { id }, data: { dailyLimit: body.dailyLimit, monthlyLimit: body.monthlyLimit } });
      return res.json({ message: 'Limits updated' });
    }

    if (id && req.method === 'DELETE') {
      if (id === userId) return res.status(400).json({ error: 'Cannot delete yourself' });
      await prisma.user.delete({ where: { id } });
      return res.json({ message: 'User deleted' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('Admin error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
