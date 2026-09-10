import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyUsed = await prisma.usageLog.count({
      where: { userId: req.user!.id, createdAt: { gte: today } },
    });
    const monthlyUsed = await prisma.usageLog.count({
      where: { userId: req.user!.id, createdAt: { gte: monthStart } },
    });

    const limits = await prisma.usageLimit.findUnique({ where: { role: req.user!.role as any } });

    const totalUsed = await prisma.usageLog.count({
      where: { userId: req.user!.id },
    });

    const recentLogs = await prisma.usageLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      dailyUsed,
      dailyLimit: limits?.dailyLimit ?? 50,
      monthlyUsed,
      monthlyLimit: limits?.monthlyLimit ?? 1000,
      dailyRemaining: (limits?.dailyLimit ?? 50) - dailyUsed,
      monthlyRemaining: (limits?.monthlyLimit ?? 1000) - monthlyUsed,
      totalUsed,
      recentLogs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

export default router;
