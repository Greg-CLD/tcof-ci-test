import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error logging middleware
 * Captures detailed context about errors including:
 * - Request path
 * - User info (if authenticated)
 * - Request body
 * - Error details
 */
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Default to 500 if no status is set
  const statusCode = err.status || 500;
  
  // Prepare user information if available (anonymized)
  const userInfo = req.user ? {
    id: (req.user as any).id,
    username: (req.user as any).username ? 'PRESENT' : 'NOT_PRESENT',
  } : 'NOT_AUTHENTICATED';
  
  // Capture request context
  const errorContext = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    user: userInfo,
    body: req.body ? 'PRESENT' : 'NOT_PRESENT',
    query: req.query,
    params: req.params,
    headers: {
      contentType: req.get('Content-Type'),
      userAgent: req.get('User-Agent'),
    },
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? 'HIDDEN_IN_PRODUCTION' : err.stack,
      name: err.name,
      code: err.code,
      statusCode,
    }
  };
  
  // Log structured error information
  console.error('❌ [ERROR] Captured error with context:', JSON.stringify(errorContext, null, 2));
  
  // Never expose stack traces or sensitive data to clients
  const clientMessage = process.env.NODE_ENV === 'production' ? 
    'An error occurred while processing your request.' : 
    err.message || 'Unknown error';
  
  // Custom error response 
  const responseBody = {
    error: true,
    message: clientMessage,
    status: statusCode,
    ...(err.errors ? { errors: err.errors } : {}), // Only include validation errors if present
  };
  
  // Send response
  res.status(statusCode).json(responseBody);
};