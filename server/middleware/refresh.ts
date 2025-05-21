/**
 * Session refresh utility for authentication
 */
import { Request } from 'express';
import { sql } from '../db';

/**
 * Refreshes the user session
 * @param req Express request object
 * @returns The user object if session is valid
 * @throws Error if session refresh fails
 */
export async function refreshSession(req: Request): Promise<any> {
  // If already authenticated, return the user
  if (req.isAuthenticated() && req.user) {
    return req.user;
  }
  
  // Check if we have a session but missing authentication
  if (!req.session || !req.sessionID) {
    throw new Error('No active session found');
  }
  
  // Try to recover the session from database
  try {
    // Check for active session in database
    const sessionResult = await sql`
      SELECT * FROM sessions WHERE sid = ${req.sessionID}
    `;
    
    if (!sessionResult || !sessionResult[0]) {
      throw new Error('Session not found in database');
    }
    
    // Parse session data
    const sessionData = sessionResult[0].sess;
    
    // Check if session contains passport user data
    if (!sessionData.passport || !sessionData.passport.user) {
      throw new Error('No user data in session');
    }
    
    // Get user from database
    const userId = sessionData.passport.user;
    const userResult = await sql`
      SELECT * FROM users WHERE id = ${userId}
    `;
    
    if (!userResult || !userResult[0]) {
      throw new Error('User not found');
    }
    
    // User found, restore session
    const user = userResult[0];
    
    // Remove password before returning
    delete user.password;
    
    // Manually restore authentication by setting req.user
    req.user = user;
    
    // Return the user
    return user;
  } catch (error: any) {
    console.error('[SESSION_REFRESH_FAILED]', error);
    throw new Error('Session refresh failed: ' + error.message);
  }
}