/**
 * Authentication middleware for the TCOF Toolkit
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
}

/**
 * Middleware to verify CSRF token
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // For mutating requests (POST, PUT, DELETE), check CSRF token
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
    const sessionToken = req.session?.csrfToken;
    
    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
  }
  
  next();
}