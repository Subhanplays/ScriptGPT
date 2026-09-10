import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, aiProvider, model } = req.body;
    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'New Script',
        userId: req.user!.id,
        aiProvider: aiProvider || 'SCRIPTGPT',
        model,
      },
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, status } = req.body;
    const conversation = await prisma.conversation.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { ...(title && { title }), ...(status && { status }) },
    });
    res.json({ message: 'Updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.conversation.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { status: 'DELETED' },
    });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
