import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as factorsDb from './factorsDb';
import { db } from "./db";
import { sql } from 'drizzle-orm';
import type { FactorTask } from '../scripts/factorUtils';
// Define the Stage type for canonical checklist tasks
type Stage = 'Identification' | 'Definition' | 'Delivery' | 'Closure';
import { projectsDb } from './projectsDb';
import { relationsDb, createRelation, loadRelations, saveRelations, saveRelation, RelationType } from './relationsDb';
import { outcomeProgressDb, outcomesDb } from './outcomeProgressDb';
import { setupAuth, isAuthenticated } from './auth'; 

// Define admin check middleware
function isAdmin(req: Request, res: Response, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Check if user has admin role or is greg@confluity.co.uk
  const user = req.user as any;
  if (user && (user.role === 'admin' || (user.username && user.username.toLowerCase() === 'greg@confluity.co.uk'))) {
    return next();
  }

  return res.status(403).json({ message: 'Not authorized' });
}

// Import organization routes
async function importOrganisationRoutes() {
  try {
    const module = await import('./routes/organisations.js');
    return module.default;
  } catch (error) {
    console.error('Failed to import organisation routes:', error);
    return null;
  }
}

// Import project routes
async function importProjectRoutes() {
  try {
    const module = await import('./routes/projects.js');
    return module.default;
  } catch (error) {
    console.error('Failed to import project routes:', error);
    return null;
  }
}

// Add test API endpoints for debugging success factors
function registerTestSuccessFactorsEndpoints(app: Express) {
  // Test endpoints for success factors diagnostics
  app.get('/api/success-factors/test-empty', (req: Request, res: Response) => {
    res.json([]);
  });

  app.get('/api/success-factors/test-error', (req: Request, res: Response) => {
    res.status(500).json({ error: 'Test error' });
  });

  app.get('/api/success-factors/test-mock', (req: Request, res: Response) => {
    res.json([
      { id: '1', factor: 'Test Factor 1', description: 'Description 1' },
      { id: '2', factor: 'Test Factor 2', description: 'Description 2' },
      { id: '3', factor: 'Test Factor 3', description: 'Description 3' },
      { id: '4', factor: 'Test Factor 4', description: 'Description 4' },
      { id: '5', factor: 'Test Factor 5', description: 'Description 5' }
    ]);
  });
}

// Store success factors in memory for faster access with fallback to DB
let cachedFactors: FactorTask[] | null = null;
let factorsCacheTime = 0;
const CACHE_TTL = 300000; // 5 minutes

// Function to get success factors with caching
async function getFactors(forceRefresh: boolean = false): Promise<FactorTask[]> {
  // If factors are cached and cache is not expired, return cached data
  const now = Date.now();
  if (!forceRefresh && cachedFactors && now - factorsCacheTime < CACHE_TTL) {
    return cachedFactors;
  }

  try {
    // Try to get success factors from the database
    const factors = await factorsDb.getFactors();
    if (factors && factors.length > 0) {
      // Update cache
      cachedFactors = factors;
      factorsCacheTime = now;
      return factors;
    }
  } catch (error) {
    console.error('Error fetching factors from database:', error);
  }

  // Fall back to file-based storage if database fails
  try {
    const successFactorsData = fs.readFileSync(path.join(process.cwd(), 'data', 'successFactors.json'), 'utf8');
    const successFactors = JSON.parse(successFactorsData);
    // Update cache
    cachedFactors = successFactors;
    factorsCacheTime = now;
    return successFactors;
  } catch (error) {
    console.error('Error reading factors from file:', error);
  }

  // Last resort fallback
  try {
    const coreTasksData = fs.readFileSync(path.join(process.cwd(), 'data', 'tcofTasks.json'), 'utf8');
    const parsedData = JSON.parse(coreTasksData);
    // Update cache
    cachedFactors = parsedData;
    factorsCacheTime = now;
    return parsedData;
  } catch (error) {
    console.error('Error reading tasks from fallback file:', error);
    return [];
  }
}

// Function to save success factors
async function saveFactors(factors: FactorTask[]): Promise<boolean> {
  try {
    // Save to database
    await factorsDb.saveFactors(factors);

    // Update cache
    cachedFactors = factors;
    factorsCacheTime = Date.now();

    return true;
  } catch (error) {
    console.error('Error saving factors to database:', error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes and middleware
  setupAuth(app);

  // Register test endpoints for debugging success factors
  registerTestSuccessFactorsEndpoints(app);

  // Register organization routes
  try {
    const organisationRoutes = await importOrganisationRoutes();
    if (organisationRoutes) {
      app.use('/api/organisations', organisationRoutes);
      console.log('Organisation routes registered successfully');
    } else {
      console.error('Failed to load organisation routes');
    }
  } catch (error) {
    console.error('Error registering organisation routes:', error);
  }

  // Register project routes
  try {
    const projectRoutes = await importProjectRoutes();
    if (projectRoutes) {
      app.use('/api/projects', projectRoutes);
      console.log('Project routes registered successfully');
    } else {
      console.error('Failed to load project routes');
    }
  } catch (error) {
    console.error('Error registering project routes:', error);
  }

  // Debug endpoint
  app.get('/api/debug', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
  
  // Success factors endpoints for frontend use - both URLs map to the same handler
  async function getFactorsHandler(req: Request, res: Response) {
    try {
      console.log('Getting success factors for frontend...');
      const factors = await getFactors();
      console.log(`Found ${factors.length} success factors`);
      res.json(factors);
    } catch (error) {
      console.error('Error fetching success factors:', error);
      res.status(500).json({ message: 'Failed to load success factors' });
    }
  }
  
  // Register both endpoints with the same handler to ensure compatibility
  app.get('/api/success-factors', getFactorsHandler);
  app.get('/api/factors', getFactorsHandler);

  // Completely public endpoint for getting tasks for the checklist - no auth check with special path
  app.get('/__tcof/public-checklist-tasks', async (req: Request, res: Response) => {
    try {
      // Enable CORS for this public endpoint
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

      // Get success factors from database
      const factors = await getFactors();
      res.json(factors);
    } catch (error) {
      console.error('Error loading public factors:', error);
      res.status(500).json({ message: 'Failed to load success factors' });
    }
  });

  // Database analysis tool endpoint for diagnosing table structure issues
  app.get('/__tcof/db-analysis', async (req: Request, res: Response) => {
    try {
      // Enable CORS for this public endpoint
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

      console.log('Running database structure analysis...');

      // Check project_tasks table
      const projectTasksCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_tasks'
        );
      `);

      const projectTasksExists = projectTasksCheck.rows && 
                               projectTasksCheck.rows[0] && 
                               projectTasksCheck.rows[0].exists;

      // Check projects table
      const projectsCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'projects'
        );
      `);

      const projectsExists = projectsCheck.rows && 
                          projectsCheck.rows[0] && 
                          projectsCheck.rows[0].exists;

      // Get project_tasks columns if the table exists
      let projectTasksColumns = [];
      if (projectTasksExists) {
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'project_tasks'
          ORDER BY ordinal_position;
        `);
        projectTasksColumns = columnsResult.rows || [];
      }

      // Get projects columns if the table exists
      let projectsColumns = [];
      if (projectsExists) {
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'projects'
          ORDER BY ordinal_position;
        `);
        projectsColumns = columnsResult.rows || [];
      }

      // Return database analysis results
      return res.json({
        tables: {
          project_tasks: {
            exists: projectTasksExists,
            columns: projectTasksColumns
          },
          projects: {
            exists: projectsExists,
            columns: projectsColumns
          }
        }
      });
    } catch (error) {
      console.error('Error analyzing database structure:', error);
      res.status(500).json({ 
        message: 'Error analyzing database structure', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Authenticated endpoint for getting tasks
  app.get('/api/tcof-tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const factors = await getFactors();
      res.json(factors);
    } catch (error) {
      console.error('Error loading tasks data:', error);
      res.status(500).json({ message: 'Failed to load tasks data' });
    }
  });

  // Admin endpoint for updating tasks
  app.post('/api/admin/tcof-tasks', isAdmin, async (req: Request, res: Response) => {
    try {
      const updatedTasks = req.body;
      if (!Array.isArray(updatedTasks)) {
        return res.status(400).json({ message: 'Invalid tasks data' });
      }

      const success = await saveFactors(updatedTasks);
      if (success) {
        return res.json({ message: 'Tasks updated successfully' });
      } else {
        return res.status(500).json({ message: 'Failed to update tasks' });
      }
    } catch (error) {
      console.error('Error updating tasks:', error);
      res.status(500).json({ message: 'Failed to update tasks' });
    }
  });

  // Project tasks API
  // Create tasks for a project
  app.post('/api/projects/:projectId/tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const taskData = req.body;

      // If an array is passed, handle each task individually
      if (Array.isArray(taskData)) {
        const results = [];
        for (const task of taskData) {
          const result = await projectsDb.createProjectTask({
            projectId,
            ...task
          });
          if (result) results.push(result);
        }
        return res.status(201).json(results);
      }

      // Otherwise, handle as a single task
      const result = await projectsDb.createProjectTask({
        projectId,
        ...taskData
      });
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating project tasks:', error);
      res.status(500).json({
        message: 'Failed to create project tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get tasks for a project
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const tasks = await projectsDb.getProjectTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error('Error retrieving project tasks:', error);
      res.status(500).json({
        message: 'Failed to retrieve project tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update a specific task for a project
  app.put('/api/projects/:projectId/tasks/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, taskId } = req.params;
      const taskUpdate = req.body;

      // Ensure we have the required fields
      if (!taskUpdate) {
        return res.status(400).json({ message: 'Task data is required' });
      }

      const updatedTask = await projectsDb.updateProjectTask(projectId, taskId, taskUpdate);
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating project task:', error);
      res.status(500).json({
        message: 'Failed to update project task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete a specific task for a project
  app.delete('/api/projects/:projectId/tasks/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, taskId } = req.params;
      await projectsDb.deleteProjectTask(projectId, taskId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project task:', error);
      res.status(500).json({
        message: 'Failed to delete project task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // System routes for diagnostics
  app.get('/api/system/database-schema', async (req, res) => {
    try {
      // Check project_tasks table structure
      const projectTasksSchema = await db.execute(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
        ORDER BY ordinal_position;
      `);

      // Check if we have any data in project_tasks
      const taskCountResult = await db.execute(`
        SELECT COUNT(*) as count FROM project_tasks;
      `);

      const taskCount = taskCountResult.rows && taskCountResult.rows.length > 0 
        ? Number(taskCountResult.rows[0].count) 
        : 0;

      // Get sample tasks (limited to 5)
      const sampleTasks = await db.execute(`
        SELECT * FROM project_tasks LIMIT 5;
      `);

      return res.json({
        project_tasks: {
          schema: projectTasksSchema,
          count: taskCount,
          samples: sampleTasks
        }
      });
    } catch (error) {
      console.error('Error checking database schema:', error);
      return res.status(500).json({ error: 'Failed to check database schema' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}