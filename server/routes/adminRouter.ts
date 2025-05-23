import express, { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { promisify } from 'util';
import { saveFactors } from '../factorsDb';

const router = express.Router();
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

function isAdmin(req: Request, res: Response, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as any;
    if (user.username && typeof user.username === 'string' && user.username.toLowerCase() === 'greg@confluity.co.uk') {
      return next();
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
}

router.post('/reset-password', isAdmin, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
    if (!user) {
      return res.status(404).json({ success: false, message: `User not found: ${email}` });
    }
    const hashedPassword = await hashPassword(password);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
    return res.status(200).json({
      success: true,
      message: `Password reset successful for ${email}`,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (error) {
    console.error('[ADMIN] Password reset error:', error);
    return res.status(500).json({ success: false, message: 'Error resetting password', error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/users', isAdmin, async (_req: Request, res: Response) => {
  try {
    const allUsers = await db.query.users.findMany();
    const safeUsers = allUsers.map(u => { const { password, ...rest } = u; return rest; });
    res.json(safeUsers);
  } catch (error) {
    console.error('[ADMIN] Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/tcof-tasks', isAdmin, async (req: Request, res: Response) => {
  const tasks = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ message: 'Invalid tasks data' });
  }
  try {
    await saveFactors(tasks);
    res.json({ message: 'Tasks updated successfully' });
  } catch (err) {
    console.error('Error updating tasks:', err);
    res.status(500).json({ message: 'Failed to update tasks' });
  }
});

export default router;
