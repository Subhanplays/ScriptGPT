import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../index';

export const trackUsage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return next();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const dailyCount = await prisma.usageLog.count({
    where: {
      userId: req.user.id,
      createdAt: { gte: today },
    },
  });

  const monthlyCount = await prisma.usageLog.count({
    where: {
      userId: req.user.id,
      createdAt: { gte: monthStart },
    },
  });

  const limits = await prisma.usageLimit.findUnique({
    where: { role: req.user.role as any },
  });

  const dailyLimit = limits?.dailyLimit ?? 50;
  const monthlyLimit = limits?.monthlyLimit ?? 1000;

  if (dailyCount >= dailyLimit) {
    return res.status(429).json({
      error: 'Daily limit reached',
      dailyUsed: dailyCount,
      dailyLimit,
      monthlyUsed: monthlyCount,
      monthlyLimit,
    });
  }

  if (monthlyCount >= monthlyLimit) {
    return res.status(429).json({
      error: 'Monthly limit reached',
      dailyUsed: dailyCount,
      dailyLimit,
      monthlyUsed: monthlyCount,
      monthlyLimit,
    });
  }

  (req as any).usageInfo = {
    dailyUsed: dailyCount,
    dailyLimit,
    monthlyUsed: monthlyCount,
    monthlyLimit,
    dailyRemaining: dailyLimit - dailyCount,
    monthlyRemaining: monthlyLimit - monthlyCount,
  };

  next();
};

export const logUsage = async (
  userId: string,
  aiProvider: string,
  model: string | undefined,
  tokens: { prompt: number; completion: number; total: number },
  conversationId?: string,
  requestType?: string
) => {
  await prisma.usageLog.create({
    data: {
      userId,
      conversationId,
      aiProvider: aiProvider as any,
      model,
      promptTokens: tokens.prompt,
      completionTokens: tokens.completion,
      totalTokens: tokens.total,
      requestType,
    },
  });
};
