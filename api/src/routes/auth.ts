import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword },
    });

    const defaultLimits = await prisma.usageLimit.findUnique({ where: { role: 'USER' } });
    if (!defaultLimits) {
      await prisma.usageLimit.create({ data: { role: 'USER', dailyLimit: 50, monthlyLimit: 1000 } });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyUsed = await prisma.usageLog.count({
      where: { userId: user.id, createdAt: { gte: today } },
    });
    const monthlyUsed = await prisma.usageLog.count({
      where: { userId: user.id, createdAt: { gte: monthStart } },
    });

    const limits = await prisma.usageLimit.findUnique({ where: { role: user.role as any } });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        geminiModel: user.geminiModel,
      },
      usage: {
        dailyUsed,
        dailyLimit: limits?.dailyLimit ?? 50,
        monthlyUsed,
        monthlyLimit: limits?.monthlyLimit ?? 1000,
        dailyRemaining: (limits?.dailyLimit ?? 50) - dailyUsed,
        monthlyRemaining: (limits?.monthlyLimit ?? 1000) - monthlyUsed,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
