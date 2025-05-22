/**
 * Middleware to ensure API endpoints always return JSON responses
 * with the correct Content-Type header
 */
import { Request, Response, NextFunction } from 'express';

/**
 * This middleware ensures that all API routes return JSON responses
 * with the correct Content-Type header, preventing HTML fallback
 */
export function forceJsonResponses(req: Request, res: Response, next: NextFunction) {
  // Only apply to API routes
  if (req.path.startsWith('/api/')) {
    // Set content type header immediately
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    
    // Store original methods
    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    
    // Create a flag to track if we've sent a response
    let responseSent = false;
    
    // Override the send method to ensure JSON format
    res.send = function(body) {
      if (responseSent) return originalSend.apply(res, [body]);
      
      responseSent = true;
      
      // Ensure Content-Type is application/json
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      // Convert body to JSON if it's not already
      if (body && typeof body !== 'string') {
        body = JSON.stringify(body);
      } else if (body && typeof body === 'string') {
        // If it's a string, try to parse it as JSON to verify
        try {
          JSON.parse(body);
          // It's valid JSON, do nothing
        } catch (e) {
          // Not valid JSON, wrap it in a JSON object
          body = JSON.stringify({ data: body });
        }
      }
      
      return originalSend.apply(res, [body]);
    };
    
    // Override json method to ensure content type
    res.json = function(body) {
      if (responseSent) return originalJson.apply(res, [body]);
      
      responseSent = true;
      
      // Ensure Content-Type is application/json
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      return originalJson.apply(res, [body]);
    };
  }
  
  next();
}