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
import { v4 as uuidv4 } from 'uuid';
import { factorsDb, type FactorTask } from './factorsDb';
import { projectsDb } from './projectsDb';
import { relationsDb, createRelation, loadRelations, saveRelations } from './relationsDb';
import { outcomeProgressDb, outcomesDb } from './outcomeProgressDb';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import {
  userInsertSchema as insertUserSchema,
  projectInsertSchema,
  outcomeInsertSchema,
  outcomeProgressInsertSchema,
  organisationMemberships
} from "@shared/schema";
import projectsRouter from './routes/projects.js';
import plansRouter from './routes/plans.js';
import usersRouter from './routes/users.js';

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
        
        // Ensure password is treated as string
        const isPasswordValid = await storage.comparePasswords(password, String(user.password));
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
          console.error('Error during login after registration:', err);
          return res.status(500).json({ message: "Account created but couldn't log you in automatically, please log in manually" });
        }
        
        // Return filtered user data
        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
        });
      }
      
      console.error("Registration error:", error);
      
      // Provide more specific error message if possible
      if (error.code === '23505') {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      
      return res.status(500).json({ message: "Registration failed, please try again" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: "Server error during login, please try again" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Session error during login:', loginErr);
          return res.status(500).json({ message: "Error creating session, please try again" });
        }
        
        // Return user data
        return res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        });
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

// Import organization routes (ESM import)
async function importOrganisationRoutes() {
  try {
    const module = await import('./routes/organisations.js');
    return module.default;
  } catch (error) {
    console.error('Failed to import organisation routes:', error);
    return null;
  }
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
  
  // Register organisation routes
  try {
    const organisationRoutes = await importOrganisationRoutes();
    if (organisationRoutes) {
      app.use('/api/organisations', organisationRoutes);
      console.log('Organisation routes registered successfully');
    }
  } catch (error) {
    console.error('Error registering organisation routes:', error);
  }
  
  // Register projects routes
  try {
    app.use('/api/projects', projectsRouter);
    console.log('Projects routes registered successfully');
  } catch (error) {
    console.error('Error registering projects routes:', error);
  }
  
  // Register plans routes
  try {
    app.use('/', plansRouter);
    console.log('Plans routes registered successfully');
  } catch (error) {
    console.error('Error registering plans routes:', error);
  }
  
  // Register user routes
  try {
    app.use('/api/users', usersRouter);
    console.log('User routes registered successfully');
  } catch (error) {
    console.error('Error registering user routes:', error);
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
      const projectId = req.query.projectId as string;
      
      console.log('Fetching goal map for projectId:', req.query.projectId);
      
      if (projectId) {
        console.log(`Fetching goal maps for project ID: ${projectId} (type: ${typeof projectId})`);
        
        // Try to get the project by UUID or numeric ID
        let project;
        
        try {
          // First try direct lookup using the projectId parameter
          project = await projectsDb.getProject(projectId);
          console.log(`Found project directly: ${project?.id}`);
        } catch (error) {
          console.log(`Error finding project directly: ${error.message}`);
          
          // If direct lookup fails and we have a numeric ID, search all projects
          if (!isNaN(Number(projectId))) {
            console.log(`Looking up numeric project ID: ${projectId}`);
            const allProjects = await projectsDb.getProjects();
            
            // Find project matching numeric ID
            project = allProjects.find(p => 
              p.id.toString() === projectId.toString() || 
              (typeof p.id === 'number' && p.id === Number(projectId))
            );
            
            if (project) {
              console.log(`Found project by numeric ID: ${project.id}`);
            }
          }
        }
        
        // If no project found, return 404
        if (!project) {
          console.log(`No project found with ID: ${projectId}`);
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Ensure user owns this project
        if (project.userId !== userId) {
          console.log(`User ${userId} not authorized for project ${project.id}`);
          return res.status(403).json({ message: "Unauthorized access to project" });
        }
        
        // Get all user's goal maps
        const goalMaps = await storage.getGoalMaps(userId);
        
        // Filter maps for this project - checking both in relations and embedded projectId
        const projectGoalMaps = goalMaps.filter(map => {
          // Check project ID in the map's embedded data
          if (map.data && map.data.projectId) {
            const mapProjectId = map.data.projectId.toString();
            const compareId = project.id.toString();
            
            if (mapProjectId === compareId) {
              console.log(`Found map with matching embedded projectId: ${mapProjectId}`);
              return true;
            }
          }
          
          // Check for relationship between map and project
          const relations = loadRelations().filter(rel => 
            rel.fromId === map.id.toString() && 
            rel.toId === project.id.toString() && 
            rel.relType === 'GOAL_MAP_FOR_PROJECT'
          );
          
          if (relations.length > 0) {
            console.log(`Found map with relation to project: ${map.id}`);
            return true;
          }
          
          return false;
        });
        
        console.log(`Found ${projectGoalMaps.length} goal maps for project ${project.id}`);
        
        if (projectGoalMaps.length > 0) {
          // Sort by lastUpdated to get the most recent
          projectGoalMaps.sort((a, b) => {
            const aTime = a.data?.lastUpdated || (a.lastModified ? a.lastModified.getTime() : 0);
            const bTime = b.data?.lastUpdated || (b.lastModified ? b.lastModified.getTime() : 0);
            return bTime - aTime;
          });
          
          // Format response with normalized data structure
          const latestMap = projectGoalMaps[0];
          const responseData = {
            id: latestMap.id,
            name: latestMap.data?.name || latestMap.name,
            nodes: latestMap.data?.nodes || [],
            connections: latestMap.data?.connections || [],
            lastUpdated: latestMap.data?.lastUpdated || (latestMap.lastModified ? latestMap.lastModified.getTime() : Date.now()),
            projectId: project.id // Always use the actual project ID
          };
          
          console.log('Fetched goal map data:', JSON.stringify(responseData, null, 2));
          return res.json(responseData);
        } else {
          // Return an empty goal map template instead of 404 to avoid client errors
          console.log(`No goal maps found for project ${project.id}, returning empty template`);
          
          const emptyTemplate = {
            id: null,
            name: "New Goal Map",
            nodes: [],
            connections: [],
            lastUpdated: Date.now(),
            projectId: project.id // Always use the actual project ID
          };
          
          console.log('Sending empty goal map template:', JSON.stringify(emptyTemplate, null, 2));
          return res.json(emptyTemplate);
        }
      } else {
        // Get all user's goal maps
        const goalMaps = await storage.getGoalMaps(userId);
        
        // Format the response
        const formattedMaps = goalMaps.map(map => ({
          id: map.id,
          name: map.data?.name || map.name,
          lastUpdated: map.data?.lastUpdated || (map.lastModified ? map.lastModified.getTime() : Date.now()),
          projectId: map.data?.projectId || null
        }));
        
        res.json(formattedMaps);
      }
    } catch (error: any) {
      console.error("Error fetching goal maps:", error);
      res.status(500).json({ message: "Error fetching goal maps: " + error.message });
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
      console.log('Saving goal map at', new Date().toISOString());
      
      const userId = (req.user as any).id;
      const { name, data, projectId } = req.body;
      
      // Log the full request body for debugging
      console.log("POST /api/goal-maps - Request body:", JSON.stringify({
        userId,
        name,
        projectId,
        data: typeof data === 'object' ? `[Object with keys: ${Object.keys(data).join(', ')}]` : data
      }, null, 2));
      
      // Validate required fields
      if (!projectId) {
        console.error("Error: Missing required field 'projectId'");
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      if (!name) {
        console.error("Error: Missing required field 'name'");
        return res.status(400).json({ message: "Name is required" });
      }
      
      if (!data) {
        console.error("Error: Missing required field 'data'");
        return res.status(400).json({ message: "Data is required" });
      }
      
      console.log(`Creating goal map with projectId: ${projectId} (type: ${typeof projectId})`);
      
      // Validate project exists and user has access
      let project;
      
      // Directly use getProject instead of getProjects
      project = await projectsDb.getProject(projectId);
      console.log(`Project lookup result:`, project ? `Found project ${project.id}` : 'No project found');
      
      if (!project) {
        console.error(`Project with ID ${projectId} not found`);
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Save the goal map with the appropriate data
      console.log(`Saving goal map for user ${userId} with name "${name}"`);
      const goalMap = await storage.saveGoalMap(userId, name, data);
      
      try {
        // Create relationship between goal map and project
        const relation = await createRelation(
          goalMap.id.toString(),
          project.id.toString(),
          'GOAL_MAP_FOR_PROJECT',
          project.id.toString(),
          { createdAt: new Date().toISOString() }
        );
        
        console.log(`Created relation between goal map ${goalMap.id} and project ${project.id}`);
      } catch (relationError) {
        console.error("Error creating relation:", relationError);
        // We'll continue even if the relation creation fails
      }
      
      console.log(`Goal map created successfully with ID: ${goalMap.id}`);
      
      // Include the projectId in the response
      const responseData = {
        ...goalMap,
        projectId: project.id
      };
      
      console.log('Goal map created response:', JSON.stringify(responseData, null, 2));
      return res.status(201).json(responseData);
    } catch (error: any) {
      console.error("Error saving goal map:", error);
      res.status(500).json({ 
        message: "Error saving goal map",
        error: error.message
      });
    }
  });

  app.put("/api/goal-maps/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Updating goal map at', new Date().toISOString());
      
      const goalMapId = parseInt(req.params.id);
      const { name, data, projectId } = req.body;
      
      // Log the full update request body for debugging
      console.log("PUT /api/goal-maps/:id - Request body:", JSON.stringify({
        goalMapId,
        name,
        projectId,
        data: typeof data === 'object' ? `[Object with keys: ${Object.keys(data).join(', ')}]` : data
      }, null, 2));
      
      // Validate all required fields
      if (!data) {
        return res.status(400).json({ message: "Data is required" });
      }
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      
      // Log the update request
      console.log(`Updating goal map ${goalMapId} for project ${projectId}`);
      
      // Get the goal map to verify ownership
      const existingMap = await storage.getGoalMap(goalMapId);
      if (!existingMap) {
        return res.status(404).json({ message: "Goal map not found" });
      }
      
      // Ensure user owns this goal map
      if (existingMap.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Validate project exists
      let project;
      
      // Direct lookup using getProject
      project = await projectsDb.getProject(projectId);
      console.log(`Project lookup result:`, project ? `Found project ${project.id}` : 'No project found');
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Update the goal map
      const updatedMap = await storage.updateGoalMap(goalMapId, data, name);
      
      try {
        // Check if there's already a relation for this goal map
        const relations = loadRelations().filter(rel => 
          rel.fromId === goalMapId.toString() && 
          rel.relType === 'GOAL_MAP_FOR_PROJECT'
        );
        
        // If relation exists with a different project, update it
        if (relations.length > 0) {
          // If the projectId changed, update the relation
          if (relations[0].toId !== projectId.toString()) {
            // Get all relations
            const allRelations = loadRelations();
            
            // Update the existing relation
            const index = allRelations.findIndex(rel => 
              rel.fromId === goalMapId.toString() && 
              rel.relType === 'GOAL_MAP_FOR_PROJECT'
            );
            
            if (index !== -1) {
              allRelations[index].toId = projectId.toString();
              allRelations[index].projectId = projectId.toString();
              allRelations[index].timestamp = new Date().toISOString();
              
              // Save updated relations
              saveRelations(allRelations);
              console.log(`Updated relation for goal map ${goalMapId} to project ${projectId}`);
            }
          }
        } else {
          // Create a new relation
          await createRelation(
            goalMapId.toString(),
            projectId.toString(),
            'GOAL_MAP_FOR_PROJECT',
            projectId.toString(),
            { createdAt: new Date().toISOString() }
          );
          
          console.log(`Created relation between goal map ${goalMapId} and project ${projectId}`);
        }
      } catch (relationError) {
        console.error("Error updating goal map relation:", relationError);
        // We'll continue even if the relation update fails
      }
      
      // Return success with the updated map and project ID
      const responseData = {
        ...updatedMap,
        projectId: projectId,
        success: true
      };
      
      console.log('Goal map updated response:', JSON.stringify(responseData, null, 2));
      return res.status(200).json(responseData);
    } catch (error: any) {
      console.error("Error updating goal map:", error);
      res.status(500).json({ message: "Error updating goal map" });
    }
  });
  
  // Mark goal mapping as complete for a project (explicit submit)
  app.post("/api/project-progress/goal-mapping/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.body;
      const userId = (req.user as any).id;
      
      if (!projectId || !userId) {
        return res.status(400).json({ message: "Missing project ID" });
      }
      
      // Validate project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Find any goal maps for this project to check if there's data
      const allGoalMaps = await storage.getGoalMaps(userId);
      
      // Filter for this project - using both embedded projectId and relations
      const goalMaps = allGoalMaps.filter(map => {
        // Check embedded projectId in data
        if (map.data && map.data.projectId === projectId) {
          return true;
        }
        
        // Check for relations
        const relations = loadRelations().filter(rel => 
          rel.fromId === map.id.toString() && 
          rel.toId === projectId && 
          rel.relType === 'GOAL_MAP_FOR_PROJECT'
        );
        
        return relations.length > 0;
      });
      
      // We'll consider the tool complete regardless of whether there are goal maps,
      // since this is a manual submission by the user
      
      // Store completion status in a dedicated data structure for tool progress
      try {
        console.log("Storing Goal Mapping completion in progress data");
        await storage.storeToolProgress(userId, projectId, "goalMapping", {
          completed: true,
          lastUpdated: new Date().toISOString(),
          hasData: goalMaps && goalMaps.length > 0
        });
      } catch (err) {
        console.error("Error storing tool progress:", err);
        // Continue even if there's an error storing the progress
      }
      
      // Return success with a completion status
      return res.status(200).json({
        completed: true,
        projectId,
        toolName: "goalMapping",
        lastUpdated: new Date().toISOString(),
        hasData: goalMaps && goalMaps.length > 0
      });
    } catch (error) {
      console.error("Error marking goal mapping as complete:", error);
      return res.status(500).json({ message: "Error marking goal mapping as complete" });
    }
  });
  
  // Get Goal Mapping completion status for a project
  app.get("/api/project-progress/goal-mapping/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.query.projectId as string;
      
      if (!projectId || !userId) {
        return res.status(400).json({ message: "Missing project ID" });
      }
      
      console.log(`Getting Goal Mapping status for project ${projectId} and user ${userId}`);
      
      // Validate project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the stored tool progress
      const progress = await storage.getToolProgress(userId, projectId, "goalMapping");
      
      if (progress) {
        console.log(`Found Goal Mapping progress for project ${projectId}:`, progress);
        return res.status(200).json(progress);
      }
      
      // If no progress found, check if there are any goal maps that would indicate completion
      const allGoalMaps = await storage.getGoalMaps(userId);
      
      // Filter for this project
      const goalMaps = allGoalMaps.filter(map => {
        // Check embedded projectId in data
        if (map.data && map.data.projectId === projectId) {
          return true;
        }
        
        // Check for relations
        const relations = loadRelations().filter(rel => 
          rel.fromId === map.id.toString() && 
          rel.toId === projectId && 
          rel.relType === 'GOAL_MAP_FOR_PROJECT'
        );
        
        return relations.length > 0;
      });
      
      // We only consider it complete if it was explicitly submitted
      // Having goal maps alone doesn't make it complete
      return res.status(200).json({
        completed: false,
        projectId,
        toolName: "goalMapping",
        hasData: goalMaps && goalMaps.length > 0
      });
    } catch (error) {
      console.error("Error getting Goal Mapping status:", error);
      return res.status(500).json({ message: "Error getting Goal Mapping status" });
    }
  });
  
  // Mark Cynefin Orientation as complete for a project (explicit submit)
  app.post("/api/project-progress/cynefin-orientation/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.body;
      const userId = (req.user as any).id;
      
      if (!projectId || !userId) {
        return res.status(400).json({ message: "Missing project ID" });
      }
      
      // Validate project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Find any Cynefin selections for this project to check if there's data
      const allSelections = await storage.getCynefinSelections(userId);
      
      // Filter for this project - using both embedded projectId and relations
      const projectSelections = allSelections.filter(selection => {
        // Check embedded projectId in data
        if (selection.data && selection.data.projectId) {
          const selectionProjectId = selection.data.projectId.toString();
          const compareId = project.id.toString();
          
          if (selectionProjectId === compareId) {
            return true;
          }
        }
        
        // Check for relations
        const relations = loadRelations().filter(rel => 
          rel.fromId === selection.id.toString() && 
          (rel.toId === project.id.toString() || rel.toId === projectId) && 
          rel.relType === 'CYNEFIN_SELECTION_FOR_PROJECT'
        );
        
        return relations.length > 0;
      });
      
      // We'll consider the tool complete regardless of whether there are selections,
      // since this is a manual submission by the user
      
      // Store completion status in a dedicated data structure for tool progress
      try {
        console.log("Storing Cynefin orientation completion in progress data");
        await storage.storeToolProgress(userId, projectId, "cynefinOrientation", {
          completed: true,
          lastUpdated: new Date().toISOString(),
          hasData: projectSelections && projectSelections.length > 0
        });
      } catch (err) {
        console.error("Error storing tool progress:", err);
        // Continue even if there's an error storing the progress
      }
      
      // Return success with a completion status
      return res.status(200).json({
        completed: true,
        projectId,
        toolName: "cynefinOrientation",
        lastUpdated: new Date().toISOString(),
        hasData: projectSelections && projectSelections.length > 0
      });
    } catch (error) {
      console.error("Error marking Cynefin Orientation as complete:", error);
      return res.status(500).json({ message: "Error marking Cynefin Orientation as complete" });
    }
  });
  
  // Get Cynefin Orientation completion status for a project
  app.get("/api/project-progress/cynefin-orientation/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.query.projectId as string;
      
      if (!projectId || !userId) {
        return res.status(400).json({ message: "Missing project ID" });
      }
      
      console.log(`Getting Cynefin orientation status for project ${projectId} and user ${userId}`);
      
      // Validate project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the stored tool progress
      const progress = await storage.getToolProgress(userId, projectId, "cynefinOrientation");
      
      if (progress) {
        console.log(`Found Cynefin orientation progress for project ${projectId}:`, progress);
        return res.status(200).json(progress);
      }
      
      // If no progress found, check if there are any selections that would indicate completion
      const allSelections = await storage.getCynefinSelections(userId);
      
      // Filter for this project
      const projectSelections = allSelections.filter(selection => {
        // Check embedded projectId in data
        if (selection.data && selection.data.projectId) {
          const selectionProjectId = selection.data.projectId.toString();
          const compareId = project.id.toString();
          
          if (selectionProjectId === compareId) {
            return true;
          }
        }
        
        // Check for relations
        const relations = loadRelations().filter(rel => 
          rel.fromId === selection.id.toString() && 
          (rel.toId === project.id.toString() || rel.toId === projectId) && 
          rel.relType === 'CYNEFIN_SELECTION_FOR_PROJECT'
        );
        
        return relations.length > 0;
      });
      
      // We only consider it complete if it was explicitly submitted
      // Having selections alone doesn't make it complete
      return res.status(200).json({
        completed: false,
        projectId,
        toolName: "cynefinOrientation",
        hasData: projectSelections && projectSelections.length > 0
      });
    } catch (error) {
      console.error("Error getting Cynefin Orientation status:", error);
      return res.status(500).json({ message: "Error getting Cynefin Orientation status" });
    }
  });
  
  // Mark TCOF Journey as complete for a project (explicit submit)
  app.post("/api/project-progress/tcof-journey/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.body;
      const userId = (req.user as any).id;
      
      if (!projectId || !userId) {
        return res.status(400).json({ message: "Missing project ID" });
      }
      
      // Validate project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Find any TCOF journeys for this project to check if there's data
      const allJourneys = await storage.getTCOFJourneys(userId);
      
      // Filter journeys for this project - checking relations and embedded projectId
      const projectJourneys = allJourneys.filter(journey => {
        // Check project ID in the journey's embedded data
        if (journey.data && journey.data.projectId) {
          const journeyProjectId = journey.data.projectId.toString();
          const compareId = project.id.toString();
          
          if (journeyProjectId === compareId) {
            return true;
          }
        }
        
        // Check for relationship between journey and project
        const relations = loadRelations().filter(rel => 
          rel.fromId === journey.id.toString() && 
          (rel.toId === project.id.toString() || rel.toId === projectId) && 
          rel.relType === 'TCOF_JOURNEY_FOR_PROJECT'
        );
        
        return relations.length > 0;
      });
      
      // We'll consider the tool complete regardless of whether there are journeys,
      // since this is a manual submission by the user
      
      // Store completion status in a dedicated data structure for tool progress
      try {
        console.log("Storing TCOF Journey completion in progress data");
        await storage.storeToolProgress(userId, projectId, "tcofJourney", {
          completed: true,
          lastUpdated: new Date().toISOString(),
          hasData: projectJourneys && projectJourneys.length > 0
        });
      } catch (err) {
        console.error("Error storing tool progress:", err);
        // Continue even if there's an error storing the progress
      }
      
      // Return success with a completion status
      return res.status(200).json({
        completed: true,
        projectId,
        toolName: "tcofJourney",
        lastUpdated: new Date().toISOString(),
        hasData: projectJourneys && projectJourneys.length > 0
      });
    } catch (error) {
      console.error("Error marking TCOF Journey as complete:", error);
      return res.status(500).json({ message: "Error marking TCOF Journey as complete" });
    }
  });
  
  // Get TCOF Journey completion status for a project
  app.get("/api/project-progress/tcof-journey/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.query.projectId as string;
      
      if (!projectId || !userId) {
        return res.status(400).json({ message: "Missing project ID" });
      }
      
      console.log(`Getting TCOF Journey status for project ${projectId} and user ${userId}`);
      
      // Validate project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the stored tool progress
      const progress = await storage.getToolProgress(userId, projectId, "tcofJourney");
      
      if (progress) {
        console.log(`Found TCOF Journey progress for project ${projectId}:`, progress);
        return res.status(200).json(progress);
      }
      
      // If no progress found, check if there are any journeys that would indicate completion
      const allJourneys = await storage.getTCOFJourneys(userId);
      
      // Filter for this project
      const projectJourneys = allJourneys.filter(journey => {
        // Check embedded projectId in data
        if (journey.data && journey.data.projectId) {
          const journeyProjectId = journey.data.projectId.toString();
          const compareId = project.id.toString();
          
          if (journeyProjectId === compareId) {
            return true;
          }
        }
        
        // Check for relations
        const relations = loadRelations().filter(rel => 
          rel.fromId === journey.id.toString() && 
          (rel.toId === project.id.toString() || rel.toId === projectId) && 
          rel.relType === 'TCOF_JOURNEY_FOR_PROJECT'
        );
        
        return relations.length > 0;
      });
      
      // We only consider it complete if it was explicitly submitted
      // Having journeys alone doesn't make it complete
      return res.status(200).json({
        completed: false,
        projectId,
        toolName: "tcofJourney",
        hasData: projectJourneys && projectJourneys.length > 0
      });
    } catch (error) {
      console.error("Error getting TCOF Journey status:", error);
      return res.status(500).json({ message: "Error getting TCOF Journey status" });
    }
  });

  // Cynefin Selection API endpoints
  app.get("/api/cynefin-selections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.query.projectId as string;
      
      if (projectId) {
        console.log(`Fetching cynefin selections for project ID: ${projectId} (type: ${typeof projectId})`);
        
        // Try to get the project by UUID or numeric ID
        let project;
        
        try {
          // First try direct lookup using the projectId parameter
          project = await projectsDb.getProject(projectId);
          console.log(`Found project directly: ${project?.id}`);
        } catch (error) {
          console.log(`Error finding project directly: ${error.message}`);
          
          // If direct lookup fails and we have a numeric ID, search all projects
          if (!isNaN(Number(projectId))) {
            console.log(`Looking up numeric project ID: ${projectId}`);
            const allProjects = await projectsDb.getProjects();
            
            // Find project matching numeric ID
            project = allProjects.find(p => 
              p.id.toString() === projectId.toString() || 
              (typeof p.id === 'number' && p.id === Number(projectId))
            );
            
            if (project) {
              console.log(`Found project by numeric ID: ${project.id}`);
            }
          }
        }
        
        // If no project found, return 404
        if (!project) {
          console.log(`No project found with ID: ${projectId}`);
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Ensure user owns this project
        if (project.userId !== userId) {
          console.log(`User ${userId} not authorized for project ${project.id}`);
          return res.status(403).json({ message: "Unauthorized access to project" });
        }
        
        // Get all user's cynefin selections
        const selections = await storage.getCynefinSelections(userId);
        
        // Filter selections for this project - checking relations
        const projectSelections = selections.filter(selection => {
          // Check project ID in the selection's embedded data
          if (selection.data && selection.data.projectId) {
            const selectionProjectId = selection.data.projectId.toString();
            const compareId = project.id.toString();
            
            if (selectionProjectId === compareId) {
              console.log(`Found selection with matching embedded projectId: ${selectionProjectId}`);
              return true;
            }
          }
          
          // Check for relationship between selection and project
          const relations = loadRelations().filter(rel => 
            rel.fromId === selection.id.toString() && 
            (rel.toId === project.id.toString() || rel.toId === projectId) && 
            rel.relType === 'CYNEFIN_SELECTION_FOR_PROJECT'
          );
          
          if (relations.length > 0) {
            console.log(`Found selection with relation to project: ${selection.id}`);
            return true;
          }
          
          return false;
        });
        
        console.log(`Found ${projectSelections.length} cynefin selections for project ${project.id}`);
        
        if (projectSelections.length > 0) {
          // Sort by lastUpdated to get the most recent
          projectSelections.sort((a, b) => {
            const aTime = a.data?.lastUpdated || (a.lastModified ? a.lastModified.getTime() : 0);
            const bTime = b.data?.lastUpdated || (b.lastModified ? b.lastModified.getTime() : 0);
            return bTime - aTime;
          });
          
          // Format response with normalized data structure
          const latestSelection = projectSelections[0];
          return res.json({
            id: latestSelection.id,
            name: latestSelection.data?.name || latestSelection.name,
            data: latestSelection.data,
            lastUpdated: latestSelection.data?.lastUpdated || (latestSelection.lastModified ? latestSelection.lastModified.getTime() : Date.now()),
            projectId: project.id // Always use the actual project ID
          });
        } else {
          return res.status(404).json({ message: "No cynefin selections found for this project" });
        }
      } else {
        // Get all user's cynefin selections
        const selections = await storage.getCynefinSelections(userId);
        
        // Format the response
        const formattedSelections = selections.map(selection => ({
          id: selection.id,
          name: selection.data?.name || selection.name,
          lastUpdated: selection.data?.lastUpdated || (selection.lastModified ? selection.lastModified.getTime() : Date.now()),
          projectId: selection.data?.projectId || null
        }));
        
        res.json(formattedSelections);
      }
    } catch (error: any) {
      console.error("Error fetching cynefin selections:", error);
      res.status(500).json({ message: "Error fetching cynefin selections: " + error.message });
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
      const projectId = req.query.projectId as string;
      
      if (projectId) {
        console.log(`Fetching TCOF journeys for project ID: ${projectId} (type: ${typeof projectId})`);
        
        // Try to get the project by UUID or numeric ID
        let project;
        
        try {
          // First try direct lookup using the projectId parameter
          project = await projectsDb.getProject(projectId);
          console.log(`Found project directly: ${project?.id}`);
        } catch (error: any) {
          console.log(`Error finding project directly: ${error.message}`);
          
          // If direct lookup fails and we have a numeric ID, search all projects
          if (!isNaN(Number(projectId))) {
            console.log(`Looking up numeric project ID: ${projectId}`);
            const allProjects = await projectsDb.getProjects();
            
            // Find project matching numeric ID
            project = allProjects.find(p => 
              p.id.toString() === projectId.toString() || 
              (typeof p.id === 'number' && p.id === Number(projectId))
            );
            
            if (project) {
              console.log(`Found project by numeric ID: ${project.id}`);
            }
          }
        }
        
        // If no project found, return 404
        if (!project) {
          console.log(`No project found with ID: ${projectId}`);
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Ensure user owns this project
        if (project.userId !== userId) {
          console.log(`User ${userId} not authorized for project ${project.id}`);
          return res.status(403).json({ message: "Unauthorized access to project" });
        }
        
        // Get all user's TCOF journeys
        const journeys = await storage.getTCOFJourneys(userId);
        
        // Filter journeys for this project - checking relations and embedded projectId
        const projectJourneys = journeys.filter(journey => {
          // Check project ID in the journey's embedded data
          if (journey.data && journey.data.projectId) {
            const journeyProjectId = journey.data.projectId.toString();
            const compareId = project.id.toString();
            
            if (journeyProjectId === compareId) {
              console.log(`Found journey with matching embedded projectId: ${journeyProjectId}`);
              return true;
            }
          }
          
          // Check for relationship between journey and project
          const relations = loadRelations().filter(rel => 
            rel.fromId === journey.id.toString() && 
            (rel.toId === project.id.toString() || rel.toId === projectId) && 
            rel.relType === 'TCOF_JOURNEY_FOR_PROJECT'
          );
          
          if (relations.length > 0) {
            console.log(`Found journey with relation to project: ${journey.id}`);
            return true;
          }
          
          return false;
        });
        
        console.log(`Found ${projectJourneys.length} TCOF journeys for project ${project.id}`);
        
        if (projectJourneys.length > 0) {
          // Sort by lastUpdated to get the most recent
          projectJourneys.sort((a, b) => {
            const aTime = a.data?.lastUpdated || (a.lastModified ? a.lastModified.getTime() : 0);
            const bTime = b.data?.lastUpdated || (b.lastModified ? b.lastModified.getTime() : 0);
            return bTime - aTime;
          });
          
          // Format response with normalized data structure
          const latestJourney = projectJourneys[0];
          return res.json({
            id: latestJourney.id,
            name: latestJourney.data?.name || latestJourney.name,
            data: latestJourney.data,
            lastUpdated: latestJourney.data?.lastUpdated || (latestJourney.lastModified ? latestJourney.lastModified.getTime() : Date.now()),
            projectId: project.id // Always use the actual project ID
          });
        } else {
          return res.status(404).json({ message: "No TCOF journeys found for this project" });
        }
      } else {
        // Get all user's TCOF journeys
        const journeys = await storage.getTCOFJourneys(userId);
        
        // Format the response
        const formattedJourneys = journeys.map(journey => ({
          id: journey.id,
          name: journey.data?.name || journey.name,
          lastUpdated: journey.data?.lastUpdated || (journey.lastModified ? journey.lastModified.getTime() : Date.now()),
          projectId: journey.data?.projectId || null
        }));
        
        res.json(formattedJourneys);
      }
    } catch (error: any) {
      console.error("Error fetching TCOF journeys:", error);
      res.status(500).json({ message: "Error fetching TCOF journeys: " + error.message });
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
      const projectId = req.query.id as string;
      const organisationId = req.query.organisationId as string;
      
      if (projectId) {
        // Return full project details for a specific project
        const project = await projectsDb.getProject(projectId);
        
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Verify access to the project
        if (project.organisationId) {
          // For organization projects, check membership
          const membership = await db.query.organisationMemberships.findFirst({
            where: and(
              eq(organisationMemberships.userId, userId),
              eq(organisationMemberships.organisationId, project.organisationId)
            )
          });
          
          if (!membership) {
            return res.status(403).json({ 
              message: "You are not a member of this organization" 
            });
          }
        } else if (project.userId !== userId) {
          // For personal projects, check ownership
          return res.status(403).json({ message: "Unauthorized access" });
        }
        
        console.log(`Fetched detailed project: ${projectId}`);
        return res.json(project);
      } else {
        // Return list of projects based on filters
        if (organisationId) {
          // Verify user's membership in the organization
          const membership = await db.query.organisationMemberships.findFirst({
            where: and(
              eq(organisationMemberships.userId, userId),
              eq(organisationMemberships.organisationId, organisationId)
            )
          });
          
          if (!membership) {
            return res.status(403).json({ 
              message: "You are not a member of this organization" 
            });
          }
          
          // Return projects for this organization
          const projects = await projectsDb.listProjects(userId, organisationId);
          console.log(`Found ${projects.length} projects for user ${userId} in organization ${organisationId}`);
          return res.json(projects);
        } else {
          // Return all user's projects
          const projects = await projectsDb.listProjects(userId);
          console.log(`Found ${projects.length} projects for user ${userId}`);
          return res.json(projects);
        }
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Error fetching projects" });
    }
  });
  
  // Outcome API endpoints
  app.get("/api/projects/:projectId/outcomes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.projectId;
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Get custom outcomes for this project
      const customOutcomes = await outcomesDb.getCustomOutcomesByUserId(userId);
      
      // Return the outcome IDs and custom outcomes
      res.json({
        selectedOutcomeIds: existingProject.selectedOutcomeIds || [],
        customOutcomes
      });
    } catch (error: any) {
      console.error("Error fetching project outcomes:", error);
      res.status(500).json({ message: "Error fetching project outcomes" });
    }
  });
  
  // Update selected outcomes for a project
  app.patch("/api/projects/:projectId/outcomes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.projectId;
      const { selectedOutcomeIds } = req.body;
      
      if (!Array.isArray(selectedOutcomeIds)) {
        return res.status(400).json({ message: "selectedOutcomeIds must be an array" });
      }
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Update the project with the selected outcome IDs
      const updatedProject = await projectsDb.updateProject(projectId, { selectedOutcomeIds });
      
      if (!updatedProject) {
        return res.status(500).json({ message: "Error updating project" });
      }
      
      res.json({ selectedOutcomeIds: updatedProject.selectedOutcomeIds || [] });
    } catch (error: any) {
      console.error("Error updating project outcomes:", error);
      res.status(500).json({ message: "Error updating project outcomes" });
    }
  });
  
  // Create a custom outcome
  app.post("/api/projects/:projectId/outcomes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.projectId;
      const { title, level = 'custom' } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Create the custom outcome
      const outcome = await outcomesDb.createCustomOutcome(title, userId, level === 'custom' ? undefined : level);
      
      if (!outcome) {
        return res.status(500).json({ message: "Error creating outcome" });
      }
      
      res.status(201).json(outcome);
    } catch (error: any) {
      console.error("Error creating custom outcome:", error);
      res.status(500).json({ message: "Error creating custom outcome" });
    }
  });
  
  // Outcome Progress API endpoints
  app.get("/api/projects/:projectId/outcomes/progress", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.projectId;
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Get all outcome progress entries for this project
      const progress = await outcomeProgressDb.getProgressByProjectId(projectId);
      
      res.json(progress);
    } catch (error: any) {
      console.error("Error fetching outcome progress:", error);
      res.status(500).json({ message: "Error fetching outcome progress" });
    }
  });
  
  // Create outcome progress entry
  app.post("/api/projects/:projectId/outcomes/:outcomeId/progress", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { projectId, outcomeId } = req.params;
      const { value } = req.body;
      
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return res.status(400).json({ message: "Value must be a number between 0 and 100" });
      }
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Create the outcome progress entry
      const progress = await outcomeProgressDb.updateOutcomeProgress(projectId, outcomeId, value);
      
      if (!progress) {
        return res.status(500).json({ message: "Error creating outcome progress" });
      }
      
      res.status(201).json(progress);
    } catch (error: any) {
      console.error("Error creating outcome progress:", error);
      res.status(500).json({ message: "Error creating outcome progress" });
    }
  });
  
  // Update outcome progress (PATCH endpoint for updating a specific outcome's progress)
  app.patch("/api/projects/:projectId/outcomes/:outcomeId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { projectId, outcomeId } = req.params;
      const { value } = req.body;
      
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return res.status(400).json({ message: "Value must be a number between 0 and 100" });
      }
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Verify that the outcome exists
      const outcome = await outcomesDb.getOutcomeById(outcomeId);
      if (!outcome) {
        return res.status(404).json({ message: "Outcome not found" });
      }
      
      // Update the outcome progress
      const updatedProgress = await outcomeProgressDb.updateOutcomeProgress(projectId, outcomeId, value);
      
      if (!updatedProgress) {
        return res.status(500).json({ message: "Error updating outcome progress" });
      }
      
      res.json(updatedProgress);
    } catch (error: any) {
      console.error("Error updating outcome progress:", error);
      res.status(500).json({ message: "Error updating outcome progress" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.id;
      const project = await projectsDb.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (project.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, project.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (project.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      res.json(project);
    } catch (error: any) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  // Project selection endpoint for tracking current project relationships
  app.post("/api/projects/select", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { projectId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Create relationship between user and project
      await createRelation(
        userId.toString(),
        projectId,
        'BELONGS_TO_PROJECT',
        projectId,
        { origin: 'selectProject' }
      );
      
      res.status(200).json({ message: "Project selection tracked successfully" });
    } catch (error: any) {
      console.error("Error tracking project selection:", error);
      res.status(500).json({ message: "Error tracking project selection" });
    }
  });
  
  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { 
        name, 
        description, 
        sector, 
        customSector, 
        orgType, 
        teamSize, 
        currentStage,
        organisationId 
      } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Project name is required" });
      }
      
      // If organisationId is provided, verify user's membership
      if (organisationId) {
        try {
          // Check if the user is a member of this organization
          const membership = await db.query.organisationMemberships.findFirst({
            where: and(
              eq(organisationMemberships.userId, userId),
              eq(organisationMemberships.organisationId, organisationId)
            )
          });
          
          if (!membership) {
            return res.status(403).json({ 
              message: "You are not a member of this organization" 
            });
          }
        } catch (orgError) {
          console.error("Error checking organization membership:", orgError);
          return res.status(500).json({ 
            message: "Error verifying organization membership" 
          });
        }
      }
      
      // Create project with minimal data - only name is required
      // Other profile fields can be completed later
      const project = await projectsDb.createProject(
        userId,
        {
          name,
          description: description || '',
          sector: sector || undefined,
          customSector: customSector || undefined,
          orgType: orgType || undefined,
          teamSize: teamSize || undefined,
          currentStage: currentStage || undefined,
          organisationId: organisationId || undefined
        }
      );
      
      if (!project) {
        return res.status(500).json({ message: "Failed to create project" });
      }

      // Create relationship between user and project
      await createRelation(
        userId.toString(),
        project.id,
        'BELONGS_TO_PROJECT',
        project.id,
        { origin: 'createProject' }
      );
      
      // Automatically create a plan for this project on server-side
      // This is a lightweight plan shell - client-side can fully populate it
      const planId = uuidv4();
      
      // Store the plan ID's association with the project
      await relationsDb.createRelation(
        planId, 
        project.id, 
        'PLAN_FOR_PROJECT', 
        project.id,
        {
          origin: 'createProject',
          stage: 'initial'
        }
      );
      
      console.log(`Project saved → ${project.id} with plan ${planId}`);
      res.status(201).json({ 
        ...project, 
        planId // Include planId in the response
      });
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Error creating project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.id;
      const { 
        name, 
        description, 
        sector, 
        customSector, 
        orgType, 
        teamSize, 
        currentStage,
        organisationId,
        isProfileComplete
      } = req.body;
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access to the project
      if (existingProject.organisationId) {
        // For organization projects, check membership
        const membership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, existingProject.organisationId)
          )
        });
        
        if (!membership) {
          return res.status(403).json({ 
            message: "You are not a member of this organization" 
          });
        }
      } else if (existingProject.userId !== userId) {
        // For personal projects, check ownership
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // If changing organization, verify membership in new organization
      if (organisationId && organisationId !== existingProject.organisationId) {
        const newOrgMembership = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(organisationMemberships.userId, userId),
            eq(organisationMemberships.organisationId, organisationId)
          )
        });
        
        if (!newOrgMembership) {
          return res.status(403).json({ 
            message: "You are not a member of the target organization" 
          });
        }
      }
      
      const updateData: { 
        name?: string; 
        description?: string;
        sector?: string;
        customSector?: string;
        orgType?: string;
        teamSize?: string;
        currentStage?: string;
        organisationId?: string;
        isProfileComplete?: boolean;
      } = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (sector !== undefined) updateData.sector = sector;
      if (customSector !== undefined) updateData.customSector = customSector;
      if (orgType !== undefined) updateData.orgType = orgType;
      if (teamSize !== undefined) updateData.teamSize = teamSize;
      if (currentStage !== undefined) updateData.currentStage = currentStage;
      if (organisationId !== undefined) updateData.organisationId = organisationId;
      if (isProfileComplete !== undefined) updateData.isProfileComplete = isProfileComplete;
      
      console.log(`Updating project ${projectId} with fields:`, JSON.stringify(updateData, null, 2));
      
      const updatedProject = await projectsDb.updateProject(projectId, updateData);
      console.log("Updated project result:", JSON.stringify(updatedProject, null, 2));
      
      if (!updatedProject) {
        return res.status(500).json({ message: "Failed to update project" });
      }
      
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Error updating project" });
    }
  });
  
  // DELETE project endpoint
  app.delete("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = req.params.id;
      
      // Get the project to verify existence
      const existingProject = await projectsDb.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user is an admin
      const isUserAdmin = !!(req.user as any).isAdmin;
      
      // Verify access to the project unless the user is an admin
      if (!isUserAdmin) {
        if (existingProject.organisationId) {
          // For organization projects, check membership
          const membership = await db.query.organisationMemberships.findFirst({
            where: and(
              eq(organisationMemberships.userId, userId),
              eq(organisationMemberships.organisationId, existingProject.organisationId)
            )
          });
          
          if (!membership) {
            return res.status(403).json({ 
              message: "You are not a member of this organization" 
            });
          }
          
          // Additionally check if user is an admin or owner of the organization
          if (membership.role !== 'admin' && membership.role !== 'owner') {
            return res.status(403).json({
              message: "Only organization admins or owners can delete projects"
            });
          }
        } else if (existingProject.userId !== userId) {
          // For personal projects, check ownership
          return res.status(403).json({ message: "Unauthorized access" });
        }
      }
      
      // For plan deletion, we'll just log a message since plans are stored client-side
      // The client will handle cleaning up plans from localStorage when needed
      console.log(`Plans for project ${projectId} should be cleaned up client-side`);
      // Note: storage in this context refers to server-side database storage, not plan storage
      
      // Delete the project
      const deleted = await projectsDb.deleteProject(projectId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete project" });
      }
      
      // Delete all relations for this project
      await relationsDb.deleteProjectRelations(projectId);
      console.log(`Relations deleted for project ${projectId}`);
      
      // Return 204 No Content for successful deletion
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Error deleting project" });
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

  // Admin endpoint for graph visualization
  app.get('/api/admin/graph', isAdmin, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      
      // Load relations (either all or filtered by project)
      let relations;
      if (projectId && typeof projectId === 'string') {
        relations = await relationsDb.getProjectRelations(projectId);
      } else {
        relations = loadRelations();
      }
      
      // Skip invalid relations (missing projectId)
      relations = relations.filter(r => r.projectId);
      
      if (relations.length > 5000) {
        console.warn(`Large graph with ${relations.length} links being sent. Consider filtering by projectId.`);
      }
      
      // Create node set from unique fromId and toId values
      const nodeSet = new Set<string>();
      relations.forEach(rel => {
        nodeSet.add(rel.fromId);
        nodeSet.add(rel.toId);
      });
      
      // Generate nodes array with type info
      const nodes = Array.from(nodeSet).map(id => {
        // Determine node type based on patterns or prefixes
        let type = 'unknown';
        if (id.startsWith('sf-')) {
          type = 'factor';
        } else if (id.startsWith('H')) {
          type = 'heuristic';
        } else if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          type = 'project';
        } else {
          type = 'task';
        }
        
        return {
          id,
          label: id,
          type
        };
      });
      
      // Create links array from relations
      const links = relations.map(rel => ({
        source: rel.fromId,
        target: rel.toId,
        relType: rel.relType
      }));
      
      // Set cache control header
      res.setHeader('Cache-Control', 'no-store');
      
      // Return graph data
      res.json({
        nodes,
        links
      });
    } catch (error: any) {
      console.error('Error generating graph data:', error);
      res.status(500).json({ message: 'Failed to generate graph data' });
    }
  });
  
  // Admin endpoint for focused node view
  app.get('/api/admin/graph/neighbours/:nodeId', isAdmin, async (req: Request, res: Response) => {
    try {
      const { nodeId } = req.params;
      const { projectId } = req.query;
      
      if (!nodeId) {
        return res.status(400).json({ message: 'Node ID is required' });
      }
      
      // Load relations (either all or filtered by project)
      let relations;
      if (projectId && typeof projectId === 'string') {
        relations = await relationsDb.getProjectRelations(projectId);
      } else {
        relations = loadRelations();
      }
      
      // Filter relations where nodeId is either fromId or toId
      const neighbourRelations = relations.filter(
        r => r.fromId === nodeId || r.toId === nodeId
      );
      
      // Skip if no relations found
      if (neighbourRelations.length === 0) {
        return res.status(404).json({ message: `No relations found for node ${nodeId}` });
      }
      
      // Create node set from the filtered relations
      const nodeSet = new Set<string>();
      nodeSet.add(nodeId); // Add the central node
      
      neighbourRelations.forEach(rel => {
        nodeSet.add(rel.fromId);
        nodeSet.add(rel.toId);
      });
      
      // Generate nodes array with type info
      const nodes = Array.from(nodeSet).map(id => {
        // Determine node type based on patterns or prefixes
        let type = 'unknown';
        if (id.startsWith('sf-')) {
          type = 'factor';
        } else if (id.startsWith('H')) {
          type = 'heuristic';
        } else if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          type = 'project';
        } else {
          type = 'task';
        }
        
        return {
          id,
          label: id,
          type,
          isCentral: id === nodeId
        };
      });
      
      // Create links array from relations
      const links = neighbourRelations.map(rel => ({
        source: rel.fromId,
        target: rel.toId,
        relType: rel.relType
      }));
      
      // Set cache control header
      res.setHeader('Cache-Control', 'no-store');
      
      // Return focused graph data
      res.json({
        nodes,
        links
      });
    } catch (error: any) {
      console.error('Error generating neighbour graph data:', error);
      res.status(500).json({ message: 'Failed to generate neighbour graph data' });
    }
  });

  // Admin endpoint to export relations data
  app.get('/api/admin/relations-export', isAdmin, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      
      // Get all relations or filtered by project if projectId is provided
      let relations;
      if (projectId && typeof projectId === 'string') {
        relations = await relationsDb.getProjectRelations(projectId);
      } else {
        // Load all relations in memory
        const allRelations = loadRelations();
        relations = allRelations;
      }
      
      // If no relations found, return 404
      if (!relations || relations.length === 0) {
        return res.status(404).json({ 
          message: projectId ? `No relations found for project ${projectId}` : 'No relations found' 
        });
      }
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      
      // Return the relations data
      res.status(200).json(relations);
    } catch (error: any) {
      console.error('Error exporting relations:', error);
      res.status(500).json({ message: 'Failed to export relations data' });
    }
  });

  // New endpoint for success factors integrity report
  app.get('/api/admin/factors-integrity', isAdmin, async (req: Request, res: Response) => {
    try {
      // Import the factor utilities dynamically
      const factorUtils = await import('../scripts/factorUtils.js');
      
      // Generate a comprehensive integrity report
      const report: {
        factorCount: number;
        taskDistribution: Record<string, number>;
        gapsByFactor: Record<string, string[]>;
        canonicalIntegrity: {
          valid: boolean;
          missing: string[];
          extra: string[];
        };
        gapReport: string[];
        overallValid?: boolean;
      } = {
        factorCount: 0,
        taskDistribution: {},
        gapsByFactor: {},
        canonicalIntegrity: {
          valid: false,
          missing: [],
          extra: []
        },
        gapReport: []
      };
      
      // Get factor metrics
      const factorsReport = factorUtils.generateFactorsReport();
      report.factorCount = factorsReport.factorCount;
      report.taskDistribution = factorsReport.tasksByStage;
      report.gapsByFactor = factorsReport.gapsByFactor;
      
      // Check canonical integrity
      const canonicalCheck = factorUtils.checkCanonicalFactorsIntegrity();
      report.canonicalIntegrity = canonicalCheck;
      
      // Get all task gaps
      report.gapReport = factorUtils.identifyTaskGaps();
      
      // Run the full integrity check
      const integrityValid = factorUtils.verifyFactorsIntegrity();
      report.overallValid = integrityValid;
      
      res.status(200).json(report);
    } catch (error) {
      console.error('Error generating factors integrity report:', error);
      res.status(500).json({ message: 'Failed to generate factors integrity report' });
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
  
  // Endpoint to export success factors data for external analysis
  app.get('/api/admin/factors-export', isAdmin, async (req: Request, res: Response) => {
    try {
      // Import the factor utilities dynamically
      const factorUtils = await import('../scripts/factorUtils.js');
      
      // Get the format parameter (default to 'json')
      const format = req.query.format as string || 'json';
      
      // Get all factors
      const factors = factorUtils.loadFactors();
      
      if (!factors || factors.length === 0) {
        return res.status(404).json({ message: 'No success factors found to export' });
      }
      
      // Set appropriate headers for download
      res.setHeader('Cache-Control', 'no-store');
      
      if (format === 'csv') {
        // Transform into CSV format (simpler format for Excel/analysis tools)
        let csvData = 'Factor ID,Factor Title,Stage,Task\n';
        
        factors.forEach(factor => {
          for (const stage in factor.tasks) {
            const tasks = factor.tasks[stage as keyof typeof factor.tasks];
            if (tasks && tasks.length > 0) {
              tasks.forEach(task => {
                // Escape any commas in the task description
                const escapedTask = `"${task.replace(/"/g, '""')}"`;
                csvData += `${factor.id},${factor.title},${stage},${escapedTask}\n`;
              });
            } else {
              // Add a row even for empty stages
              csvData += `${factor.id},${factor.title},${stage},""\n`;
            }
          }
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="success-factors-export.csv"`);
        res.status(200).send(csvData);
      } else {
        // Return JSON format (with special formatting for better readability)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="success-factors-export.json"`);
        res.status(200).json(factors);
      }
    } catch (error) {
      console.error('Error exporting success factors:', error);
      res.status(500).json({ message: 'Failed to export success factors data' });
    }
  });
  
  // Public API endpoint for success factors (accessible to all authenticated users)
  app.get('/api/factors', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get factors from the database
      const factors = factorsDb.getAll();
      
      if (!factors || factors.length === 0) {
        console.warn('No success factors found in database, attempting to load from file');
        // Try to load from file if database is empty
        const factorsFromFile = await getFactors(true);
        if (factorsFromFile && factorsFromFile.length > 0) {
          return res.json(factorsFromFile);
        }
        return res.status(404).json({ message: 'No success factors found' });
      }
      
      res.json(factors);
    } catch (error: any) {
      console.error('Error getting success factors:', error);
      res.status(500).json({ message: 'Failed to get success factors' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
