import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';

function verifyAdmin(req: VercelRequest): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch { return null; }
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = verifyAdmin(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });

  const slug = (req.query.slug as string[]) || [];
  const sub = slug[0] || '';

  let body: any = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch { body = {}; }
  }

  try {
    if (sub === 'dashboard' && req.method === 'GET') {
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

    if (sub === 'users' && req.method === 'GET' && slug.length === 1) {
      const users = await prisma.user.findMany({ select: { id: true, email: true, username: true, role: true, dailyLimit: true, monthlyLimit: true, createdAt: true, _count: { select: { conversations: true, usageLogs: true } } }, orderBy: { createdAt: 'desc' } });
      return res.json(users);
    }

    if (sub === 'create-user' && req.method === 'POST') {
      const { email, username, password, role, dailyLimit, monthlyLimit } = body;
      if (!email || !username || !password) return res.status(400).json({ error: 'Email, username, and password are required' });
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
      if (existing) return res.status(409).json({ error: 'Email or username already exists' });
      const hashed = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({ data: { email, username, password: hashed, role: role || 'USER', dailyLimit: dailyLimit || 50, monthlyLimit: monthlyLimit || 1000 } });
      return res.status(201).json({ id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role });
    }

    if (sub === 'limits' && req.method === 'GET' && slug.length === 1) {
      const limits = await prisma.usageLimit.findMany();
      return res.json(limits);
    }

    if (sub === 'limits' && req.method === 'PUT' && slug.length === 2) {
      const { dailyLimit, monthlyLimit } = body;
      await prisma.usageLimit.upsert({ where: { role: slug[1] as any }, update: { dailyLimit, monthlyLimit }, create: { role: slug[1] as any, dailyLimit, monthlyLimit } });
      return res.json({ message: 'Limits updated' });
    }

    if (sub === 'conversations' && req.method === 'GET') {
      const convs = await prisma.conversation.findMany({ orderBy: { updatedAt: 'desc' }, take: 100, include: { user: { select: { id: true, username: true, email: true } }, _count: { select: { messages: true } } } });
      return res.json(convs);
    }

    if (sub === 'usage' && req.method === 'GET') {
      const logs = await prisma.usageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { id: true, username: true, email: true } } } });
      return res.json(logs);
    }

    if (sub === 'logs' && req.method === 'GET') {
      const logs = await prisma.systemLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
      return res.json(logs);
    }

    if (sub === 'logs' && req.method === 'POST') {
      const { level, message, metadata } = body;
      const log = await prisma.systemLog.create({ data: { level, message, metadata } });
      return res.status(201).json(log);
    }

    if (sub === 'settings' && req.method === 'GET') {
      const settings = await prisma.systemSetting.findMany();
      const obj: Record<string, string> = {}; settings.forEach(s => { obj[s.key] = s.value; });
      return res.json(obj);
    }

    if (sub === 'settings' && req.method === 'PUT') {
      for (const [key, value] of Object.entries(body)) {
        await prisma.systemSetting.upsert({ where: { key }, update: { value: value as string, updatedBy: userId }, create: { key, value: value as string, updatedBy: userId } });
      }
      return res.json({ message: 'Settings updated' });
    }

    if (sub === 'gemini-status' && req.method === 'GET') {
      const usersWithKeys = await prisma.user.count({ where: { geminiApiKey: { not: null } } });
      return res.json({ scriptgptConfigured: !!process.env.ADMIN_GEMINI_KEY, usersWithGeminiKeys: usersWithKeys });
    }

    if (sub === 'users' && slug.length >= 2 && slug[1]) {
      const targetId = slug[1];
      const action = slug[2] || '';

      if (action === 'role' && req.method === 'PUT') {
        if (!['USER', 'ADMIN'].includes(body.role)) return res.status(400).json({ error: 'Invalid role' });
        await prisma.user.update({ where: { id: targetId }, data: { role: body.role } });
        return res.json({ message: 'Role updated' });
      }

      if (action === 'limits' && req.method === 'PUT') {
        await prisma.user.update({ where: { id: targetId }, data: { dailyLimit: body.dailyLimit, monthlyLimit: body.monthlyLimit } });
        return res.json({ message: 'Limits updated' });
      }

      if (req.method === 'DELETE' && !action) {
        if (targetId === userId) return res.status(400).json({ error: 'Cannot delete yourself' });
        await prisma.user.delete({ where: { id: targetId } });
        return res.json({ message: 'User deleted' });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('Admin error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
