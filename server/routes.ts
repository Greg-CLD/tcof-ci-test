import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // For this application, no API routes are needed as all data is stored client-side
  
  // Setup basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const httpServer = createServer(app);

  return httpServer;
}
