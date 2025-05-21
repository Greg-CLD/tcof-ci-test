/**
 * Session refresh middleware for authentication
 */
import { Request, Response, NextFunction } from 'express';
import { refreshSession } from '../middleware/refresh';

/**
 * Middleware to handle session refresh
 * Returns 401 JSON response on authentication failures
 */
export async function handleSessionRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await refreshSession(req);
    req.user = user;
    return next();
  } catch (err) {
    console.error('[AUTH_ERROR]', err);
    return res
      .status(401)
      .json({ 
        success: false, 
        error: 'AUTH_EXPIRED', 
        message: 'Session refresh failed' 
      });
  }
}