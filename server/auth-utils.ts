import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Helper function to hash passwords
 */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
}

/**
 * Helper function to compare passwords
 */
export function comparePasswords(suppliedPassword: string, storedPassword: string): boolean {
  try {
    const [hash, salt] = storedPassword.split('.');
    
    if (!hash || !salt) {
      console.error('Invalid password format:', { hasHash: !!hash, hasSalt: !!salt });
      return false;
    }
    
    const suppliedHash = createHash('sha256');
    suppliedHash.update(suppliedPassword + salt);
    const suppliedDigest = suppliedHash.digest('hex');
    
    return suppliedDigest === hash;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}