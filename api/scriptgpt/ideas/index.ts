import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';
import { SCRIPTGPT_SYSTEM_PROMPT, SCRIPT_IDEAS_PROMPT } from '../../src/utils/scriptgpt-prompt';

function verify(req: VercelRequest): string | null {
  const t = req.headers.authorization?.replace('Bearer ', '');
  if (!t) return null;
  try { return (jwt.verify(t, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return null; }
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = verify(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const adminKey = process.env.ADMIN_GEMINI_KEY;
  if (!adminKey) return res.status(500).json({ error: 'ScriptGPT AI not configured' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const genAI = new GoogleGenerativeAI(adminKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: SCRIPTGPT_SYSTEM_PROMPT });
    const result = await model.generateContentStream(SCRIPT_IDEAS_PROMPT);
    let fullText = '';
    for await (const chunk of result.stream) { fullText += chunk.text(); res.write(`data: ${JSON.stringify({ text: chunk.text(), done: false })}\n\n`); }
    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    if (!res.writableEnded) { res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`); res.end(); }
  }
}
