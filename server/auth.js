/**
 * Authentication utilities for the TCOF Toolkit
 */
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt with salt
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} A promise that resolves to the hashed password with salt
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare a plain text password against a stored hash
 * @param {string} suppliedPassword - The plain text password to check
 * @param {string} storedPassword - The hashed password from the database
 * @returns {Promise<boolean>} A promise that resolves to true if passwords match
 */
export async function comparePasswords(suppliedPassword, storedPassword) {
  const [hash, salt] = storedPassword.split('.');
  const hashedBuf = Buffer.from(hash, 'hex');
  const suppliedBuf = await scryptAsync(suppliedPassword, salt, 64);
  
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Export a middleware function to check if a user is authenticated
export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
}