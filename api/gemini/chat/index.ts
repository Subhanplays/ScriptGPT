import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';
import { SCRIPTGPT_SYSTEM_PROMPT } from '../../src/utils/scriptgpt-prompt';

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

  let body: any;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch { return res.status(400).json({ error: 'Invalid body' }); }

  const { conversationId, message } = body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.geminiApiKey) return res.status(400).json({ error: 'No Gemini API key configured. Add one in Settings.' });

  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  } else {
    const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
    conversation = await prisma.conversation.create({ data: { title, userId, aiProvider: 'GEMINI', model: user.geminiModel || 'gemini-2.0-flash' } });
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: message, aiProvider: 'GEMINI' } });
  const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' } });

  const genAI = new GoogleGenerativeAI(user.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: user.geminiModel || 'gemini-2.0-flash', systemInstruction: SCRIPTGPT_SYSTEM_PROMPT });
  const chat = model.startChat({ history: messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await chat.sendMessageStream(message);
    let fullText = '';
    for await (const chunk of result.stream) { fullText += chunk.text(); res.write(`data: ${JSON.stringify({ text: chunk.text(), done: false })}\n\n`); }
    res.write(`data: ${JSON.stringify({ text: '', done: true, conversationId: conversation.id })}\n\n`);
    res.end();
    await prisma.message.create({ data: { conversationId: conversation.id, role: 'assistant', content: fullText, aiProvider: 'GEMINI', model: user.geminiModel || 'gemini-2.0-flash' } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  } catch (error: any) {
    if (!res.writableEnded) { res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`); res.end(); }
  }
}
