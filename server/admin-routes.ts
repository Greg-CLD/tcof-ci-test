/**
 * Admin-only routes for system management tasks
 * These routes are only available in development mode or with admin authentication
 */

import { Request, Response } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

/**
 * Hash password using scrypt (matching auth implementation)
 * This is the exact same function used in the auth system
 */
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Check if user is an admin
 */
function isAdmin(req: Request, res: Response, next: any) {
  if (req.isAuthenticated() && req.user) {
    // Case-insensitive comparison of the username/email
    const user = req.user as any;
    if (
      user.username && 
      typeof user.username === 'string' && 
      user.username.toLowerCase() === 'greg@confluity.co.uk'
    ) {
      return next();
    }
  }
  
  // Only allow in development mode without auth
  if (process.env.NODE_ENV === 'development') {
    console.log('[ADMIN] Development mode - allowing admin access without authentication');
    return next();
  }
  
  res.status(403).json({ message: "Admin access required" });
}

/**
 * Register admin routes with the Express app
 */
export function registerAdminRoutes(app: any) {
  /**
   * Reset a user's password (admin only)
   * 
   * POST /api/admin/reset-password
   * Body: { email: string, password: string }
   */
  app.post('/api/admin/reset-password', isAdmin, async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 6 characters" 
      });
    }
    
    try {
      // Find the user
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: `User not found: ${email}` 
        });
      }
      
      // Generate password hash
      const hashedPassword = await hashPassword(password);
      
      // Update the user's password
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      // Return success
      console.log(`[ADMIN] Password reset successful for user: ${email}`);
      return res.status(200).json({ 
        success: true, 
        message: `Password reset successful for ${email}`,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      });
    } catch (error) {
      console.error('[ADMIN] Password reset error:', error);
      return res.status(500).json({ 
        success: false, 
        message: "Error resetting password",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Get all users (admin only)
   * 
   * GET /api/admin/users
   */
  app.get('/api/admin/users', isAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await db.query.users.findMany();
      
      // Remove sensitive information
      const safeUsers = allUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error('[ADMIN] Error fetching users:', error);
      return res.status(500).json({ 
        message: "Error fetching users",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}