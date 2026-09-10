import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const SYSTEM_PROMPT = `You are ScriptGPT, an AI assistant exclusively dedicated to creating, modifying, and explaining Bash/Shell scripts.`;
const IDEAS_PROMPT = `Generate a list of 5-10 useful Bash script ideas. For each idea, provide: 1. A catchy title 2. A one-sentence description 3. Difficulty level (beginner/intermediate/advanced) 4. One use case. Focus on practical scripts for sysadmins, DevOps, and developers. Include automation, maintenance, backup, monitoring, and productivity scripts. Format as a numbered list.`;

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

  let adminKey = process.env.ADMIN_GEMINI_KEY;
  if (!adminKey) {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'ADMIN_GEMINI_KEY' } });
    adminKey = setting?.value;
  }
  if (!adminKey) return res.status(500).json({ error: 'ScriptGPT AI not configured. Please ask the admin to set the Gemini API key.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = new GoogleGenAI({ apiKey: adminKey });
    const response = await ai.models.generateContentStream({
      model: 'gemini-3.6-flash',
      contents: IDEAS_PROMPT,
      config: { systemInstruction: SYSTEM_PROMPT },
    });
    let fullText = '';
    for await (const chunk of response) {
      const text = chunk.text || '';
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Ideas error:', error.message);
    if (!res.writableEnded) { res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to generate ideas', done: true })}\n\n`); res.end(); }
  }
}
