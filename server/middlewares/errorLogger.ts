import { Request, Response, NextFunction } from 'express';

export default function errorLogger(
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Extract user ID from request if authenticated
  const userId = (req as any).user?.id || 'unauthenticated';
  
  // Comprehensive error logging with request context
  console.error({
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    user: userId,
    body: req.body,
    query: req.query,
    params: req.params,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      status: err.status || 500
    }
  });
  
  // Send appropriate response to client
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
}