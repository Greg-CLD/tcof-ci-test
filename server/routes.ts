import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { factorsDb, type FactorTask } from './factorsDb';
import { 
  insertUserSchema, 
  insertGoalMapSchema, 
  insertCynefinSelectionSchema, 
  insertTcofJourneySchema, 
  insertProjectSchema 
} from "@shared/schema";

// Initialize Stripe with your secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Set up authentication middleware
function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "tcof-dev-secret-key-change-in-production";
    console.warn("SESSION_SECRET not set, using default value. Set this in production!");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        
        const isPasswordValid = await storage.comparePasswords(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Incorrect password." });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the user - ensure email is a string or undefined, not null
      const user = await storage.createUser({
        username: userData.username,
        password: userData.password,
        email: userData.email || undefined
      });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login" });
        }
        return res.status(201).json(user);
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

// Check if user is authenticated middleware
function isAuthenticated(req: Request, res: Response, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Check if user is an admin (case-insensitive email check)
function isAdmin(req: Request, res: Response, next: any) {
  if (req.isAuthenticated() && req.user) {
    // Case-insensitive comparison of the username/email
    const user = req.user as any;
    if (user.username && typeof user.username === 'string' && user.username.toLowerCase() === 'greg@confluity.co.uk') {
      return next();
    }
  }
  res.status(403).json({ message: "Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Initialize the factors database
  try {
    console.log('Initializing factors database during registerRoutes...');
    await initializeFactorsDatabase();
    console.log('Factors database initialized successfully');
  } catch (error) {
    console.error('Error initializing factors database:', error);
  }

  // Setup basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Route for creating a checkout session for the Starter Kit (£9)
  app.post("/api/checkout-starter", async (req: Request, res: Response) => {
    try {
      // Create a checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: "TCOF Starter Kit Access",
                description: "Access to the TCOF Starter Kit tools",
              },
              unit_amount: 900, // £9.00 in pence
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/tools/starter-access?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/`,
      });

      // Log the URL for debugging
      console.log("Stripe checkout URL:", session.url);
      
      res.status(200).json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: {
          message: error.message || "An error occurred with the checkout process.",
        },
      });
    }
  });

  // For Stripe webhooks, we'd need a raw parser middleware but 
  // for simplicity we'll skip detailed webhook implementation
  app.post("/api/webhook-event", async (req: Request, res: Response) => {
    try {
      const { type, data } = req.body;
      
      if (type === "checkout.session.completed") {
        const session = data.object;
        console.log("Payment successful for session:", session.id);
        // Here you would typically update your database with user's payment info
      }
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Goal Map API endpoints
  app.get("/api/goal-maps", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const goalMaps = await storage.getGoalMaps(userId);
      res.json(goalMaps);
    } catch (error: any) {
      console.error("Error fetching goal maps:", error);
      res.status(500).json({ message: "Error fetching goal maps" });
    }
  });

  app.get("/api/goal-maps/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const goalMapId = parseInt(req.params.id);
      const goalMap = await storage.getGoalMap(goalMapId);
      
      if (!goalMap) {
        return res.status(404).json({ message: "Goal map not found" });
      }
      
      // Ensure user owns this goal map
      if (goalMap.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      res.json(goalMap);
    } catch (error: any) {
      console.error("Error fetching goal map:", error);
      res.status(500).json({ message: "Error fetching goal map" });
    }
  });

  app.post("/api/goal-maps", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { name, data } = req.body;
      
      if (!name || !data) {
        return res.status(400).json({ message: "Name and data are required" });
      }
      
      const goalMap = await storage.saveGoalMap(userId, name, data);
      res.status(201).json(goalMap);
    } catch (error: any) {
      console.error("Error saving goal map:", error);
      res.status(500).json({ message: "Error saving goal map" });
    }
  });

  app.put("/api/goal-maps/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const goalMapId = parseInt(req.params.id);
      const { name, data } = req.body;
      
      if (!data) {
        return res.status(400).json({ message: "Data is required" });
      }
      
      // Get the goal map to verify ownership
      const existingMap = await storage.getGoalMap(goalMapId);
      if (!existingMap) {
        return res.status(404).json({ message: "Goal map not found" });
      }
      
      // Ensure user owns this goal map
      if (existingMap.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const updatedMap = await storage.updateGoalMap(goalMapId, data, name);
      res.json(updatedMap);
    } catch (error: any) {
      console.error("Error updating goal map:", error);
      res.status(500).json({ message: "Error updating goal map" });
    }
  });

  // Cynefin Selection API endpoints
  app.get("/api/cynefin-selections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const selections = await storage.getCynefinSelections(userId);
      res.json(selections);
    } catch (error: any) {
      console.error("Error fetching cynefin selections:", error);
      res.status(500).json({ message: "Error fetching cynefin selections" });
    }
  });

  app.get("/api/cynefin-selections/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const selectionId = parseInt(req.params.id);
      const selection = await storage.getCynefinSelection(selectionId);
      
      if (!selection) {
        return res.status(404).json({ message: "Cynefin selection not found" });
      }
      
      // Ensure user owns this selection
      if (selection.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      res.json(selection);
    } catch (error: any) {
      console.error("Error fetching cynefin selection:", error);
      res.status(500).json({ message: "Error fetching cynefin selection" });
    }
  });

  app.post("/api/cynefin-selections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { name, data } = req.body;
      
      if (!name || !data) {
        return res.status(400).json({ message: "Name and data are required" });
      }
      
      const selection = await storage.saveCynefinSelection(userId, name, data);
      res.status(201).json(selection);
    } catch (error: any) {
      console.error("Error saving cynefin selection:", error);
      res.status(500).json({ message: "Error saving cynefin selection" });
    }
  });

  app.put("/api/cynefin-selections/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const selectionId = parseInt(req.params.id);
      const { name, data } = req.body;
      
      if (!data) {
        return res.status(400).json({ message: "Data is required" });
      }
      
      // Get the selection to verify ownership
      const existingSelection = await storage.getCynefinSelection(selectionId);
      if (!existingSelection) {
        return res.status(404).json({ message: "Cynefin selection not found" });
      }
      
      // Ensure user owns this selection
      if (existingSelection.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const updatedSelection = await storage.updateCynefinSelection(selectionId, data, name);
      res.json(updatedSelection);
    } catch (error: any) {
      console.error("Error updating cynefin selection:", error);
      res.status(500).json({ message: "Error updating cynefin selection" });
    }
  });

  // TCOF Journey API endpoints
  app.get("/api/tcof-journeys", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const journeys = await storage.getTCOFJourneys(userId);
      res.json(journeys);
    } catch (error: any) {
      console.error("Error fetching TCOF journeys:", error);
      res.status(500).json({ message: "Error fetching TCOF journeys" });
    }
  });

  app.get("/api/tcof-journeys/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const journeyId = parseInt(req.params.id);
      const journey = await storage.getTCOFJourney(journeyId);
      
      if (!journey) {
        return res.status(404).json({ message: "TCOF journey not found" });
      }
      
      // Ensure user owns this journey
      if (journey.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      res.json(journey);
    } catch (error: any) {
      console.error("Error fetching TCOF journey:", error);
      res.status(500).json({ message: "Error fetching TCOF journey" });
    }
  });

  app.post("/api/tcof-journeys", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { name, data } = req.body;
      
      if (!name || !data) {
        return res.status(400).json({ message: "Name and data are required" });
      }
      
      const journey = await storage.saveTCOFJourney(userId, name, data);
      res.status(201).json(journey);
    } catch (error: any) {
      console.error("Error saving TCOF journey:", error);
      res.status(500).json({ message: "Error saving TCOF journey" });
    }
  });

  app.put("/api/tcof-journeys/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const journeyId = parseInt(req.params.id);
      const { name, data } = req.body;
      
      if (!data) {
        return res.status(400).json({ message: "Data is required" });
      }
      
      // Get the journey to verify ownership
      const existingJourney = await storage.getTCOFJourney(journeyId);
      if (!existingJourney) {
        return res.status(404).json({ message: "TCOF journey not found" });
      }
      
      // Ensure user owns this journey
      if (existingJourney.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const updatedJourney = await storage.updateTCOFJourney(journeyId, data, name);
      res.json(updatedJourney);
    } catch (error: any) {
      console.error("Error updating TCOF journey:", error);
      res.status(500).json({ message: "Error updating TCOF journey" });
    }
  });

  // Project API endpoints
  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Error fetching projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Ensure user owns this project
      if (project.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      res.json(project);
    } catch (error: any) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { name, description, goalMapId, cynefinSelectionId, tcofJourneyId } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Project name is required" });
      }
      
      const project = await storage.createProject(
        userId, 
        name, 
        description || null, 
        goalMapId || null, 
        cynefinSelectionId || null, 
        tcofJourneyId || null
      );
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Error creating project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name, description, goalMapId, cynefinSelectionId, tcofJourneyId } = req.body;
      
      // Get the project to verify ownership
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Ensure user owns this project
      if (existingProject.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (goalMapId !== undefined) updateData.goalMapId = goalMapId;
      if (cynefinSelectionId !== undefined) updateData.cynefinSelectionId = cynefinSelectionId;
      if (tcofJourneyId !== undefined) updateData.tcofJourneyId = tcofJourneyId;
      
      const updatedProject = await storage.updateProject(projectId, updateData);
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Error updating project" });
    }
  });

  // Set up utilities for success factors using file system
  // factorsDb is imported from './factorsDb'
  
  // Initialize the database with default success factors
  async function initializeFactorsDatabase(): Promise<boolean> {
    try {
      // First check if we already have factors file
      const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
      if (fs.existsSync(factorsPath)) {
        try {
          const data = fs.readFileSync(factorsPath, 'utf8');
          const parsed = JSON.parse(data) as FactorTask[];
          if (parsed && parsed.length > 0) {
            // Update the database
            factorsDb.setAll(parsed);
            console.log(`Database already initialized with ${parsed.length} success factors`);
            return true;
          }
        } catch (error) {
          console.warn('Error reading existing success factors:', error);
        }
      }
      
      // No existing factors, load from default file
      const v2FactorsPath = path.join(process.cwd(), 'data', 'tcof_success_factors_v2.json');
      if (fs.existsSync(v2FactorsPath)) {
        const rawData = fs.readFileSync(v2FactorsPath, 'utf8');
        let v2Factors: any[] = JSON.parse(rawData);
        
        // Transform the data to match our expected format if needed
        const transformedFactors: FactorTask[] = v2Factors.map(factor => ({
          id: factor.id,
          title: factor.title,
          tasks: {
            Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
            Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
            Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
            Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
          }
        }));
        
        // Save to database
        const result = await saveFactors(transformedFactors);
        if (result) {
          console.log(`Successfully initialized database with ${transformedFactors.length} success factors from tcof_success_factors_v2.json`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing factors database:', error);
      return false;
    }
  }
  
  // Get factors from database or file system with guaranteed task structure
  async function getFactors(forceRefresh: boolean = false): Promise<FactorTask[]> {
    // If we're forcing a refresh, or the database is empty
    if (forceRefresh || factorsDb.length === 0) {
      try {
        // Try to load from successFactors.json
        const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
        if (fs.existsSync(factorsPath)) {
          const data = fs.readFileSync(factorsPath, 'utf8');
          const parsed = JSON.parse(data) as FactorTask[];
          
          // Update database (normalization happens in factorsDb.setAll)
          factorsDb.setAll(parsed);
          
          console.log(`Loaded ${parsed.length} factors from disk${forceRefresh ? ' (forced refresh)' : ''}`);
          return factorsDb.getAll();
        }
      } catch (error) {
        console.error('Error refreshing factors from disk:', error);
      }
    }
    
    // If no refresh needed or refresh failed, return current data
    // Note: factorsDb.getAll() already normalizes task structure
    return factorsDb.getAll();
  }
  
  // Legacy function kept for backward compatibility
  async function _getFactorsLegacy(): Promise<FactorTask[]> {
    if (factorsDb.length > 0) {
      return factorsDb.getAll();
    }
    
    try {
      // Try to load from successFactors.json first
      const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
      if (fs.existsSync(factorsPath)) {
        const data = fs.readFileSync(factorsPath, 'utf8');
        const parsed = JSON.parse(data) as FactorTask[];
        
        // Update database
        factorsDb.setAll(parsed);
        
        return factorsDb.getAll();
      }
      
      // Fall back to tcofTasks.json if needed
      const tasksPath = path.join(process.cwd(), 'data', 'tcofTasks.json');
      if (fs.existsSync(tasksPath)) {
        const data = fs.readFileSync(tasksPath, 'utf8');
        const parsed = JSON.parse(data) as FactorTask[];
        
        // Update database
        factorsDb.setAll(parsed);
        
        return factorsDb.getAll();
      }
      
      // Fall back to tcof_success_factors_v2.json if needed
      const v2FactorsPath = path.join(process.cwd(), 'data', 'tcof_success_factors_v2.json');
      if (fs.existsSync(v2FactorsPath)) {
        // Direct load from v2 JSON to avoid circular references
        const rawData = fs.readFileSync(v2FactorsPath, 'utf8');
        const v2Factors = JSON.parse(rawData);
        
        // Transform the data to match our expected format if needed
        const transformedFactors: FactorTask[] = v2Factors.map((factor: any) => ({
          id: factor.id,
          title: factor.title,
          tasks: {
            Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
            Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
            Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
            Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
          }
        }));
        
        // Save to file
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(
          path.join(dataDir, 'successFactors.json'), 
          JSON.stringify(transformedFactors, null, 2),
          'utf8'
        );
        
        // Update database
        factorsDb.setAll(transformedFactors);
        
        return factorsDb.getAll();
      }
      
      return factorsDb.getAll();
    } catch (error) {
      console.error('Error loading factors:', error);
      return factorsDb.getAll();
    }
  }
  
  // Save factors to database and file system for persistence
  async function saveFactors(factors: FactorTask[]): Promise<boolean> {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Normalize task structure for each factor before saving
      const normalizedFactors = factors.map(factor => ({
        id: factor.id,
        title: factor.title,
        tasks: {
          Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
          Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
          Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
          Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
        }
      }));
      
      // Save to file system
      fs.writeFileSync(
        path.join(dataDir, 'successFactors.json'), 
        JSON.stringify(normalizedFactors, null, 2),
        'utf8'
      );
      
      // Update the database - factorsDb.setAll also normalizes the data
      factorsDb.setAll(normalizedFactors);
      
      console.log(`Saved ${normalizedFactors.length} factors with normalized task structure`);
      return true;
    } catch (error) {
      console.error('Error saving factors:', error);
      return false;
    }
  }
  
  // Admin preset editor API endpoints
  app.get('/api/admin/tcof-tasks', isAdmin, async (req: Request, res: Response) => {
    try {
      // First try to load the success factors from database
      const factors = await getFactors();
      
      if (factors && factors.length > 0) {
        return res.json(factors);
      }
      
      // If no factors in DB, try to load from files
      try {
        const successFactorsData = fs.readFileSync(path.join(process.cwd(), 'data', 'successFactors.json'), 'utf8');
        const parsedFactors = JSON.parse(successFactorsData);
        
        // Store in database for future use
        await saveFactors(parsedFactors);
        
        return res.json(parsedFactors);
      } catch (sfError) {
        console.warn('successFactors.json not found, falling back to tcofTasks.json');
      }
      
      // Fall back to the old format if needed
      const coreTasksData = fs.readFileSync(path.join(process.cwd(), 'data', 'tcofTasks.json'), 'utf8');
      const oldFormatData = JSON.parse(coreTasksData);
      
      // Store in database for future use
      await saveFactors(oldFormatData);
      
      res.json(oldFormatData);
    } catch (error: any) {
      console.error('Error loading tasks data:', error);
      res.status(500).json({ message: 'Failed to load core tasks data' });
    }
  });
  
  app.post('/api/admin/tcof-tasks', isAdmin, async (req: Request, res: Response) => {
    try {
      
      // Validate request data
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of success factors.' });
      }
      
      // Save the success factors (this already normalizes task structure and writes to file)
      await saveFactors(req.body);
      
      // Get the normalized data to return
      const normalizedFactors = await getFactors(true); // Force refresh from database
      
      res.json({ 
        success: true, 
        message: 'Success factors saved successfully',
        count: normalizedFactors.length 
      });
    } catch (error: any) {
      console.error('Error saving success factors:', error);
      res.status(500).json({ message: 'Failed to save success factors data' });
    }
  });
  
  // Success Factor Editor API endpoints
  app.get('/api/admin/success-factors', isAdmin, async (req: Request, res: Response) => {
    try {
      const factors = await getFactors();
      res.json(factors || []);
    } catch (error: any) {
      console.error('Error getting success factors:', error);
      res.status(500).json({ message: 'Failed to get success factors' });
    }
  });
  
  // Endpoint to run factor deduplication (admin only)
  app.post('/api/admin/deduplicate-factors', isAdmin, async (req: Request, res: Response) => {
    try {
      
      console.log('Starting deduplication process via API endpoint...');
      
      // Get all existing factors
      const rawFactors = await getFactors();
      
      if (!rawFactors || rawFactors.length === 0) {
        return res.status(404).json({ message: 'No factors found to deduplicate' });
      }
      
      console.log(`Found ${rawFactors.length} factors to deduplicate`);
      
      // Official TCOF success factors - these are the ones we want to keep and merge duplicates into
      const officialFactorTitles = [
        "1.1 Ask Why",
        "1.2 Get a Masterbuilder",
        "1.3 Get Your People on the Bus",
        "1.4 Make Friends and Keep them Friendly",
        "2.1 Recognise that your project is not unique",
        "2.2 Look for Tried & Tested Options",
        "3.1 Think Big, Start Small",
        "3.2 Learn by Experimenting",
        "3.3 Keep on top of risks",
        "4.1 Adjust for optimism",
        "4.2 Measure What Matters, Be Ready to Step Away",
        "4.3 Be Ready to Adapt"
      ];
      
      // Mapping of official factor titles to their actual database IDs
      const officialFactorIdMap: Record<string, string> = {};
      
      // First pass - identify official factors by exact title match
      rawFactors.forEach(factor => {
        const normalizedTitle = factor.title.trim();
        
        // If this is an official factor title, remember its ID
        if (officialFactorTitles.includes(normalizedTitle)) {
          officialFactorIdMap[normalizedTitle] = factor.id;
        }
      });
      
      // Deduplicate by factor title
      const dedupMap: Record<string, FactorTask> = {};
      
      type StageKey = 'Identification' | 'Definition' | 'Delivery' | 'Closure';
      const stages: StageKey[] = ['Identification', 'Definition', 'Delivery', 'Closure'];
      
      // Process each raw factor
      rawFactors.forEach(item => {
        const normalizedTitle = item.title.trim();
        
        // If this title already exists in our map, merge tasks
        if (dedupMap[normalizedTitle]) {
          // Merge tasks from all stages
          stages.forEach(stage => {
            const sourceTasks = item.tasks?.[stage] || [];
            
            for (const task of sourceTasks) {
              // Only add unique tasks (avoid duplicates)
              if (!dedupMap[normalizedTitle].tasks[stage].includes(task)) {
                dedupMap[normalizedTitle].tasks[stage].push(task);
              }
            }
          });
        } 
        // If this is a new title, add it to the map
        else {
          // Create a base entry
          dedupMap[normalizedTitle] = { 
            title: normalizedTitle, 
            id: officialFactorIdMap[normalizedTitle] || item.id, // Use official ID if available
            tasks: {
              Identification: [...(item.tasks?.Identification || [])],
              Definition: [...(item.tasks?.Definition || [])],
              Delivery: [...(item.tasks?.Delivery || [])],
              Closure: [...(item.tasks?.Closure || [])]
            }
          };
        }
      });

      // Make sure all official factors exist
      officialFactorTitles.forEach((title, index) => {
        if (!dedupMap[title]) {
          dedupMap[title] = {
            title: title,
            id: officialFactorIdMap[title] || `sf-${index + 1}`,
            tasks: {
              Identification: [],
              Definition: [],
              Delivery: [],
              Closure: []
            }
          };
        }
      });
      
      // Filter to keep only the official factors
      const dedupFactors = officialFactorTitles.map(title => dedupMap[title]);
      
      // Verify we have exactly 12 factors
      if (dedupFactors.length !== 12) {
        return res.status(500).json({
          message: `Error: Expected 12 deduplicated factors but found ${dedupFactors.length}`,
          factors: dedupFactors.map(f => f.title)
        });
      }
      
      // Assign consistent IDs
      dedupFactors.forEach((factor, index) => {
        if (!factor.id || factor.id.includes("duplicate")) {
          factor.id = `sf-${index + 1}`;
        }
      });
      
      // Save to database
      await saveFactors(dedupFactors);
      
      console.log(`Successfully deduplicated ${rawFactors.length} factors to 12 official TCOF success factors`);
      
      res.json({ 
        success: true, 
        message: `Deduplicated ${rawFactors.length} factors to 12 official TCOF success factors`,
        originalCount: rawFactors.length,
        newCount: dedupFactors.length,
        factors: dedupFactors.map(f => `${f.id}: ${f.title}`)
      });
    } catch (error: any) {
      console.error('Error deduplicating factors:', error);
      res.status(500).json({ message: 'Failed to deduplicate factors', error: error.message });
    }
  });
  
  app.get('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const factorId = req.params.id;
      const factors = await getFactors();
      
      if (!factors || factors.length === 0) {
        return res.status(404).json({ message: 'No success factors found' });
      }
      
      const factor = factors.find((f: FactorTask) => f.id === factorId);
      
      if (!factor) {
        return res.status(404).json({ message: `Success factor with ID ${factorId} not found` });
      }
      
      res.json(factor);
    } catch (error: any) {
      console.error('Error getting success factor:', error);
      res.status(500).json({ message: 'Failed to get success factor' });
    }
  });
  
  app.post('/api/admin/success-factors', isAdmin, async (req: Request, res: Response) => {
    try {
      
      const newFactor = req.body;
      
      // Validate the new factor
      if (!newFactor.id || !newFactor.title || !newFactor.tasks) {
        return res.status(400).json({ message: 'Invalid factor data. Must include id, title, and tasks.' });
      }
      
      // Get existing factors
      const factors = await getFactors() || [];
      
      // Check if factor with this ID already exists
      if (factors.some((f: FactorTask) => f.id === newFactor.id)) {
        return res.status(409).json({ message: `Factor with ID ${newFactor.id} already exists` });
      }
      
      // Add the new factor
      factors.push(newFactor);
      
      // Save updated factors
      await saveFactors(factors);
      
      res.status(201).json(newFactor);
    } catch (error: any) {
      console.error('Error creating success factor:', error);
      res.status(500).json({ message: 'Failed to create success factor' });
    }
  });
  
  app.put('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      
      const factorId = req.params.id;
      const updatedFactor = req.body;
      
      // Validate the updated factor
      if (!updatedFactor.id || !updatedFactor.title || !updatedFactor.tasks) {
        return res.status(400).json({ message: 'Invalid factor data. Must include id, title, and tasks.' });
      }
      
      // Get existing factors
      const factors = await getFactors() || [];
      
      // Find the factor to update
      const factorIndex = factors.findIndex((f: FactorTask) => f.id === factorId);
      
      if (factorIndex === -1) {
        return res.status(404).json({ message: `Success factor with ID ${factorId} not found` });
      }
      
      // Ensure the ID in the body matches the URL parameter
      if (updatedFactor.id !== factorId) {
        return res.status(400).json({ message: 'Factor ID in body must match ID in URL' });
      }
      
      // Update the factor
      factors[factorIndex] = updatedFactor;
      
      // Save updated factors
      await saveFactors(factors);
      
      res.json(updatedFactor);
    } catch (error: any) {
      console.error('Error updating success factor:', error);
      res.status(500).json({ message: 'Failed to update success factor' });
    }
  });
  
  app.delete('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      
      const factorId = req.params.id;
      
      // Get existing factors
      const factors = await getFactors() || [];
      
      // Find the factor to delete
      const factorIndex = factors.findIndex(f => f.id === factorId);
      
      if (factorIndex === -1) {
        return res.status(404).json({ message: `Success factor with ID ${factorId} not found` });
      }
      
      // Remove the factor
      factors.splice(factorIndex, 1);
      
      // Save updated factors
      await saveFactors(factors);
      
      res.json({ success: true, message: `Success factor with ID ${factorId} deleted` });
    } catch (error: any) {
      console.error('Error deleting success factor:', error);
      res.status(500).json({ message: 'Failed to delete success factor' });
    }
  });

  app.post('/api/admin/update-canonical-factors', isAdmin, async (req: Request, res: Response) => {
    try {
      
      console.log('Starting canonical factor update via API endpoint...');
      
      // Get all existing factors
      const rawFactors = await getFactors();
      
      if (!rawFactors || rawFactors.length === 0) {
        return res.status(404).json({ message: 'No factors found to update' });
      }
      
      console.log(`Found ${rawFactors.length} existing factors in database`);
      
      // The 12 official TCOF success factors to use
      const officialFactorTitles = [
        "1.1 Ask Why",
        "1.2 Get a Masterbuilder",
        "1.3 Get Your People on the Bus",
        "1.4 Make Friends and Keep them Friendly",
        "2.1 Recognise that your project is not unique",
        "2.2 Look for Tried & Tested Options",
        "3.1 Think Big, Start Small",
        "3.2 Learn by Experimenting",
        "3.3 Keep on top of risks",
        "4.1 Adjust for optimism",
        "4.2 Measure What Matters, Be Ready to Step Away",
        "4.3 Be Ready to Adapt"
      ];
      
      // Create the 12 canonical factors
      type StageKey = 'Identification' | 'Definition' | 'Delivery' | 'Closure';
      const stages: StageKey[] = ['Identification', 'Definition', 'Delivery', 'Closure'];
      const canonicalFactors: FactorTask[] = [];
      
      for (let i = 0; i < officialFactorTitles.length; i++) {
        const title = officialFactorTitles[i];
        const factorId = `sf-${i + 1}`;
        
        // Try to find an existing factor with exact title match
        let existingFactor = rawFactors.find(f => f.title.trim() === title);
        
        // If no exact match, try to find any factor with similar title
        if (!existingFactor) {
          // Extract number prefix (e.g., "1.1" from "1.1 Ask Why")
          const prefix = title.split(' ')[0];
          
          // Look for factors that might match by prefix or keyword
          existingFactor = rawFactors.find(f => 
            f.title.includes(prefix) || 
            title.toLowerCase().includes(f.title.toLowerCase()) ||
            f.title.toLowerCase().includes(title.toLowerCase().split(' ').slice(1).join(' '))
          );
        }
        
        // If we found a matching factor, merge its tasks
        if (existingFactor) {
          canonicalFactors.push({
            id: factorId,
            title: title,
            tasks: {
              Identification: [...(existingFactor.tasks?.Identification || [])],
              Definition: [...(existingFactor.tasks?.Definition || [])],
              Delivery: [...(existingFactor.tasks?.Delivery || [])],
              Closure: [...(existingFactor.tasks?.Closure || [])]
            }
          });
        } else {
          // If no match, create new factor with empty tasks
          canonicalFactors.push({
            id: factorId,
            title: title,
            tasks: {
              Identification: [],
              Definition: [],
              Delivery: [],
              Closure: []
            }
          });
        }
      }
      
      // Save the canonical factors to database
      await saveFactors(canonicalFactors);
      
      console.log(`Successfully updated database with 12 canonical success factors`);
      
      res.json({ 
        success: true, 
        message: `Successfully updated to the 12 canonical TCOF success factors`,
        factors: canonicalFactors.map(f => f.title)
      });
    } catch (error: any) {
      console.error('Error updating canonical factors:', error);
      res.status(500).json({ message: 'Failed to update canonical factors', error: error.message });
    }
  });
  
  app.get('/api/admin/preset-heuristics', isAdmin, async (req: Request, res: Response) => {
    try {
      const presetHeuristicsData = fs.readFileSync(path.join(process.cwd(), 'data', 'presetHeuristics.json'), 'utf8');
      res.json(JSON.parse(presetHeuristicsData));
    } catch (error: any) {
      console.error('Error loading presetHeuristics.json:', error);
      res.status(500).json({ message: 'Failed to load preset heuristics data' });
    }
  });
  
  // Update success factor tasks from CSV
  app.post('/api/admin/update-factor-tasks', isAdmin, async (req: Request, res: Response) => {
    try {
      // Import dynamically to avoid circular dependencies - using dynamic import for ES modules
      const updateFactorsModule = await import('../scripts/updateFactorTasks.js');
      const { updateFactorTasks } = updateFactorsModule;
      
      const result = await updateFactorTasks();
      
      if (!result.success) {
        return res.status(500).json({ error: result.message });
      }
      
      // Refresh the in-memory database from disk
      await getFactors(true);
      
      res.json({ 
        success: true, 
        message: result.message || 'Successfully updated success factor tasks'
      });
    } catch (error: any) {
      console.error('Error updating factor tasks:', error);
      res.status(500).json({ error: 'Error updating factor tasks: ' + error.message });
    }
  });

  app.post('/api/admin/preset-heuristics', isAdmin, async (req: Request, res: Response) => {
    try {
      // Validate request data
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of heuristics.' });
      }
      
      // Save the updated heuristics to the file
      fs.writeFileSync(
        path.join(process.cwd(), 'data', 'presetHeuristics.json'), 
        JSON.stringify(req.body, null, 2),
        'utf8'
      );
      
      res.json({ success: true, message: 'Preset heuristics saved successfully' });
    } catch (error: any) {
      console.error('Error saving presetHeuristics.json:', error);
      res.status(500).json({ message: 'Failed to save preset heuristics data' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
