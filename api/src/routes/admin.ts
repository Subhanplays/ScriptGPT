import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalConversations = await prisma.conversation.count({ where: { status: 'ACTIVE' } });
    const totalMessages = await prisma.message.count();
    const totalUsage = await prisma.usageLog.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const dailyUsage = await prisma.usageLog.count({
      where: { createdAt: { gte: today } },
    });

    const weeklyUsage = await prisma.usageLog.count({
      where: { createdAt: { gte: weekAgo } },
    });

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    const usageByProvider = await prisma.usageLog.groupBy({
      by: ['aiProvider'],
      _count: true,
    });

    res.json({
      totalUsers,
      totalConversations,
      totalMessages,
      totalUsage,
      dailyUsage,
      weeklyUsage,
      recentUsers,
      usageByProvider,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        dailyLimit: true,
        monthlyLimit: true,
        createdAt: true,
        _count: { select: { conversations: true, usageLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await prisma.user.update({ where: { id: req.params.id as string }, data: { role } });
    res.json({ message: 'Role updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.put('/users/:id/limits', async (req: AuthRequest, res: Response) => {
  try {
    const { dailyLimit, monthlyLimit } = req.body;
    await prisma.user.update({
      where: { id: req.params.id as string },
      data: { dailyLimit, monthlyLimit },
    });
    res.json({ message: 'Limits updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update limits' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if ((req.params.id as string) === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await prisma.user.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/limits', async (req: AuthRequest, res: Response) => {
  try {
    const limits = await prisma.usageLimit.findMany();
    res.json(limits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

router.put('/limits/:role', async (req: AuthRequest, res: Response) => {
  try {
    const { dailyLimit, monthlyLimit } = req.body;
    await prisma.usageLimit.upsert({
      where: { role: req.params.role as any },
      update: { dailyLimit, monthlyLimit },
      create: { role: req.params.role as any, dailyLimit, monthlyLimit },
    });
    res.json({ message: 'Limits updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update limits' });
  }
});

router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, email: true } },
        _count: { select: { messages: true } },
      },
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.post('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { level, message, metadata } = req.body;
    const log = await prisma.systemLog.create({
      data: { level, message, metadata },
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create log' });
  }
});

router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => { settingsObj[s.key] = s.value; });
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as string, updatedBy: req.user!.id },
        create: { key, value: value as string, updatedBy: req.user!.id },
      });
    }
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.usageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch usage logs' });
  }
});

router.get('/gemini-status', async (req: AuthRequest, res: Response) => {
  try {
    const adminKey = process.env.ADMIN_GEMINI_KEY;
    const usersWithKeys = await prisma.user.count({
      where: { geminiApiKey: { not: null } },
    });
    res.json({
      scriptgptConfigured: !!adminKey,
      usersWithGeminiKeys: usersWithKeys,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Gemini status' });
  }
});

router.post('/create-user', async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password, role, dailyLimit, monthlyLimit } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: role || 'USER',
        dailyLimit: dailyLimit || 50,
        monthlyLimit: monthlyLimit || 1000,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
