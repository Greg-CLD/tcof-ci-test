/**
 * Helper to ensure task update endpoints always return proper JSON responses
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Sets content type and proper headers for task update endpoints
 */
export function ensureJsonContentType(res: Response) {
  // Set the header only once to ensure consistent response format
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  return res;
}