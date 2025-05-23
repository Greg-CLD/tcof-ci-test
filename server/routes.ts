import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { setupAuth } from './auth';

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // simple debug route retained
  app.get('/api/debug', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  return createServer(app);
}
