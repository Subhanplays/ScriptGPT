import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';

function verifyToken(req: VercelRequest): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return (jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = verifyToken(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const slug = (req.query.slug as string[]) || [];
  const sub = slug[0] || '';

  try {
    if (req.method === 'GET' && sub === 'profile') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ id: user.id, email: user.email, username: user.username, role: user.role, geminiModel: user.geminiModel, dailyLimit: user.dailyLimit, monthlyLimit: user.monthlyLimit, createdAt: user.createdAt });
    }

    if (req.method === 'PUT' && !sub) {
      const { username, email } = req.body;
      const updateData: any = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      await prisma.user.update({ where: { id: userId }, data: updateData });
      return res.json({ message: 'Updated' });
    }

    if (req.method === 'PUT' && sub === 'password') {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
      return res.json({ message: 'Password updated' });
    }

    if (req.method === 'PUT' && sub === 'gemini-key') {
      const { geminiApiKey, geminiModel } = req.body;
      const updateData: any = {};
      if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey;
      if (geminiModel) updateData.geminiModel = geminiModel;
      await prisma.user.update({ where: { id: userId }, data: updateData });
      return res.json({ message: 'Gemini settings updated' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('Users error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
