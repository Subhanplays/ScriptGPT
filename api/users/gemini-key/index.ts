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
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const userId = verify(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  try {
    const { geminiApiKey, geminiModel } = req.body;
    const d: any = {};
    if (geminiApiKey !== undefined) d.geminiApiKey = geminiApiKey;
    if (geminiModel) d.geminiModel = geminiModel;
    await prisma.user.update({ where: { id: userId }, data: d });
    return res.json({ message: 'Gemini settings updated' });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
