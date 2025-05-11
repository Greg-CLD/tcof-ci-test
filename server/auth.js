import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export async function comparePasswords(suppliedPassword, storedPassword) {
  const [hash, salt] = storedPassword.split('.');
  const hashedBuf = Buffer.from(hash, 'hex');
  const suppliedBuf = await scryptAsync(suppliedPassword, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}