import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureCanonicalFactors } from "./ensureCanonicalFactors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run the factors integrity check using child_process
  try {
    const { spawnSync } = await import('child_process');
    const { dirname, resolve, join } = await import('path');
    const { fileURLToPath } = await import('url');
    
    // Get current module's directory (ES Module alternative to __dirname)
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFilePath);
    
    const scriptPath = resolve(currentDir, '../scripts/verifyFactors.js');
    log(`Running factors integrity check: ${scriptPath}`);
    
    const result = spawnSync('node', [scriptPath], { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    if (result.error) {
      log(`Error running factors integrity check: ${result.error.message}`);
    } else if (result.status !== 0) {
      log(`Factors integrity check exited with status: ${result.status}`);
    } else {
      log('Factors integrity check completed');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error running success factors integrity check: ${errorMessage}`);
  }

  // Initialize the canonical factors on startup
  const factorsUpdated = await ensureCanonicalFactors();
  if (factorsUpdated) {
    log('Canonical factors updated on server startup');
  } else {
    log('Canonical factors check completed - no updates needed');
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
