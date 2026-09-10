import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';

function verify(req: VercelRequest): string | null {
  const t = req.headers.authorization?.replace('Bearer ', '');
  if (!t) return null;
  try { return (jwt.verify(t, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const userId = verify(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  try {
    const id = req.query.id as string | undefined;

    if (req.method === 'GET' && !id) {
      const conversations = await prisma.conversation.findMany({ where: { userId, status: 'ACTIVE' }, orderBy: { updatedAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } } });
      return res.json(conversations);
    }

    if (req.method === 'POST') {
      const { title, aiProvider, model } = req.body;
      const conversation = await prisma.conversation.create({ data: { title: title || 'New Script', userId, aiProvider: aiProvider || 'SCRIPTGPT', model } });
      return res.status(201).json(conversation);
    }

    if (req.method === 'GET' && id) {
      const conversation = await prisma.conversation.findFirst({ where: { id, userId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
      if (!conversation) return res.status(404).json({ error: 'Not found' });
      return res.json(conversation);
    }

    if (req.method === 'PUT' && id) {
      const { title, status } = req.body;
      await prisma.conversation.updateMany({ where: { id, userId }, data: { ...(title && { title }), ...(status && { status }) } });
      return res.json({ message: 'Updated' });
    }

    if (req.method === 'DELETE' && id) {
      await prisma.conversation.updateMany({ where: { id, userId }, data: { status: 'DELETED' } });
      return res.json({ message: 'Deleted' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
