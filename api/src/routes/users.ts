import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      geminiModel: user.geminiModel,
      dailyLimit: user.dailyLimit,
      monthlyLimit: user.monthlyLimit,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email } = req.body;
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });
    res.json({ id: user.id, email: user.email, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.put('/gemini-key', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { geminiApiKey, geminiModel } = req.body;
    const updateData: any = {};
    if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey;
    if (geminiModel) updateData.geminiModel = geminiModel;

    await prisma.user.update({ where: { id: req.user!.id }, data: updateData });
    res.json({ message: 'Gemini settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Gemini settings' });
  }
});

export default router;
