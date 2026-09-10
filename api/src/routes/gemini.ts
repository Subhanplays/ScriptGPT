import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { trackUsage, logUsage } from '../middleware/usage';
import { SCRIPTGPT_SYSTEM_PROMPT } from '../utils/scriptgpt-prompt';

const router = Router();

router.post('/chat', authenticate, trackUsage, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.geminiApiKey) {
      return res.status(400).json({
        error: 'No Gemini API key configured. Please add your Gemini API key in Settings.',
      });
    }

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: req.user!.id },
      });
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    } else {
      const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
      conversation = await prisma.conversation.create({
        data: {
          title,
          userId: req.user!.id,
          aiProvider: 'GEMINI',
          model: user.geminiModel || 'gemini-2.0-flash',
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
        aiProvider: 'GEMINI',
      },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const genAI = new GoogleGenerativeAI(user.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: user.geminiModel || 'gemini-2.0-flash',
      systemInstruction: SCRIPTGPT_SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await chat.sendMessageStream(message);
    let fullResponse = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true, conversationId: conversation.id })}\n\n`);
    res.end();

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: fullResponse,
        aiProvider: 'GEMINI',
        model: user.geminiModel || 'gemini-2.0-flash',
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await logUsage(
      req.user!.id,
      'GEMINI',
      user.geminiModel || 'gemini-2.0-flash',
      { prompt: message.length, completion: fullResponse.length, total: message.length + fullResponse.length },
      conversation.id,
      'chat'
    );
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
      return res.status(400).json({ error: 'Invalid Gemini API key. Please check your API key in Settings.' });
    }
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

router.get('/models', authenticate, async (req: AuthRequest, res: Response) => {
  const models = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and efficient' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Lightweight and fast' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Balanced performance' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
  ];
  res.json(models);
});

export default router;
