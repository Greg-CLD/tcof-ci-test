/**
 * Middleware to check if a user is authenticated
 * Use this to protect routes that require authentication
 */
export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "Authentication required" });
}