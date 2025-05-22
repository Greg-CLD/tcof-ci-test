import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorLogger } from "./middlewares/errorLogger";
import { registerSuccessFactorsRoutes } from "./routes.factorsDb.simple";
import { forceJsonResponses } from "./middleware/forceJsonResponses";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply JSON response middleware to ensure proper content type headers
app.use(forceJsonResponses);

// Move health check to /health endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

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

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

(async () => {
  // Run the factors integrity check using improved utilities
  try {
    console.log('Starting server initialization...');
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

  // Register our database-backed success factors routes
  await registerSuccessFactorsRoutes(app);

  // Register main routes
  const server = await registerRoutes(app);

  // Add centralized error logging middleware
  app.use(errorLogger);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the API routes and static files
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    app.use(express.static("dist/public"));
    app.get("*", (_req, res) => {
      res.sendFile("index.html", { root: "./dist/public" });
    });
  }

  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`Server started successfully on port ${port}`);
  });
})();