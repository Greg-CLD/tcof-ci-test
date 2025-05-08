import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import errorLogger from "./middlewares/errorLogger";
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
  // Run the factors integrity check using improved utilities
  try {
    log('Running success factors integrity check...');
    
    // Use the improved factor utilities
    const factorUtils = await import('../scripts/factorUtils.js') as typeof import('../scripts/factorUtils');
    
    if (factorUtils.verifyFactorsIntegrity()) {
      log('Success factors integrity check passed');
    } else {
      log('Success factors integrity check failed - issues detected');
      
      // Generate a detailed report
      const report = factorUtils.generateFactorsReport();
      log(`Factor count: ${report.factorCount}`);
      log(`Task distribution: ${JSON.stringify(report.tasksByStage)}`);
      
      // Check canonical integrity
      const canonicalCheck = factorUtils.checkCanonicalFactorsIntegrity();
      if (!canonicalCheck.valid) {
        if (canonicalCheck.missing.length > 0) {
          log(`Missing canonical factors: ${canonicalCheck.missing.join(', ')}`);
        }
        if (canonicalCheck.extra.length > 0) {
          log(`Extra non-canonical factors: ${canonicalCheck.extra.join(', ')}`);
        }
      }
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

  // Add centralized error logging middleware
  app.use(errorLogger);

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
