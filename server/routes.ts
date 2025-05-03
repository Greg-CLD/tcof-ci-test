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

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

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
  
  // Simple server-side factors database
  // Define our factor interface
  interface FactorTask {
    id: string;
    title: string;
    tasks: {
      Identification: string[];
      Definition: string[];
      Delivery: string[];
      Closure: string[];
    };
  }
  
  let factorsCache: FactorTask[] | null = null;
  
  // Get factors from file system
  async function getFactors(): Promise<FactorTask[]> {
    if (factorsCache) {
      return factorsCache;
    }
    
    try {
      // Try to load from successFactors.json first
      const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
      if (fs.existsSync(factorsPath)) {
        const data = fs.readFileSync(factorsPath, 'utf8');
        const parsed = JSON.parse(data) as FactorTask[];
        factorsCache = parsed;
        return factorsCache;
      }
      
      // Fall back to tcofTasks.json if needed
      const tasksPath = path.join(process.cwd(), 'data', 'tcofTasks.json');
      if (fs.existsSync(tasksPath)) {
        const data = fs.readFileSync(tasksPath, 'utf8');
        const parsed = JSON.parse(data) as FactorTask[];
        factorsCache = parsed;
        return factorsCache;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading factors:', error);
      return [];
    }
  }
  
  // Save factors to file system
  async function saveFactors(factors: FactorTask[]): Promise<boolean> {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(dataDir, 'successFactors.json'), 
        JSON.stringify(factors, null, 2),
        'utf8'
      );
      
      // Update the cache
      factorsCache = factors;
      
      return true;
    } catch (error) {
      console.error('Error saving factors:', error);
      return false;
    }
  }
  
  // Admin preset editor API endpoints
  app.get('/api/admin/tcof-tasks', isAuthenticated, async (req: Request, res: Response) => {
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
  
  app.post('/api/admin/tcof-tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users to update success factors
      if ((req.user as any).username !== 'greg@confluity.co.uk') {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
      }
      
      // Validate request data
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of success factors.' });
      }
      
      // Ensure data directory exists (for backward compatibility)
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Save the success factors to the database
      await saveFactors(req.body);
      
      // Also save to file for backward compatibility
      fs.writeFileSync(
        path.join(dataDir, 'successFactors.json'), 
        JSON.stringify(req.body, null, 2),
        'utf8'
      );
      
      res.json({ success: true, message: 'Success factors saved successfully' });
    } catch (error: any) {
      console.error('Error saving success factors:', error);
      res.status(500).json({ message: 'Failed to save success factors data' });
    }
  });
  
  // Success Factor Editor API endpoints
  app.get('/api/admin/success-factors', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const factors = await getFactors();
      res.json(factors || []);
    } catch (error: any) {
      console.error('Error getting success factors:', error);
      res.status(500).json({ message: 'Failed to get success factors' });
    }
  });
  
  app.get('/api/admin/success-factors/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  
  app.post('/api/admin/success-factors', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users to create success factors
      if ((req.user as any).username !== 'greg@confluity.co.uk') {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
      }
      
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
  
  app.put('/api/admin/success-factors/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users to update success factors
      if ((req.user as any).username !== 'greg@confluity.co.uk') {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
      }
      
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
  
  app.delete('/api/admin/success-factors/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users to delete success factors
      if ((req.user as any).username !== 'greg@confluity.co.uk') {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
      }
      
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

  app.get('/api/admin/preset-heuristics', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const presetHeuristicsData = fs.readFileSync(path.join(process.cwd(), 'data', 'presetHeuristics.json'), 'utf8');
      res.json(JSON.parse(presetHeuristicsData));
    } catch (error: any) {
      console.error('Error loading presetHeuristics.json:', error);
      res.status(500).json({ message: 'Failed to load preset heuristics data' });
    }
  });

  app.post('/api/admin/preset-heuristics', isAuthenticated, async (req: Request, res: Response) => {
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
