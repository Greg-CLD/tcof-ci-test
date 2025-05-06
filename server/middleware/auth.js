/**
 * Authentication middleware for the TCOF Toolkit
 */

/**
 * Middleware to check if a user is authenticated
 * @param {Express.Request} req - The Express request object
 * @param {Express.Response} res - The Express response object
 * @param {Express.NextFunction} next - The Express next function
 */
export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
}

/**
 * Middleware to verify CSRF token
 * @param {Express.Request} req - The Express request object
 * @param {Express.Response} res - The Express response object
 * @param {Express.NextFunction} next - The Express next function
 */
export function csrfProtection(req, res, next) {
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