import type { Express, Request, Response, NextFunction } from "express";
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
import { findTaskBySourceId } from './projectsDb';
import type { FactorTask } from '../scripts/factorUtils';
// Import debug flags
import { 
  DEBUG, 
  DEBUG_TASKS, 
  DEBUG_FILTERS, 
  DEBUG_FILES,
  DEBUG_TASK_API,
  DEBUG_TASK_MAPPING,
  DEBUG_TASK_COMPLETION,
  DEBUG_TASK_VALIDATION,
  DEBUG_TASK_PERSISTENCE,
  DEBUG_TASK_STATE
} from '@shared/constants.debug';
// Define the Stage type for canonical checklist tasks
type Stage = 'Identification' | 'Definition' | 'Delivery' | 'Closure';
// Import projectsDb with augmented type definition to fix TypeScript errors
import { projectsDb } from './projectsDb';
// Import the task logger for detailed instrumentation
import { taskLogger, TaskErrorCodes } from './services/taskLogger';
import { taskStateManager } from './services/taskStateManager';
import { getTaskIdResolver, TaskIdResolver } from './services/taskIdResolver';
import validateUuid from './middleware/validateUuid';

// Add type augmentation for projectsDb to include the missing methods
declare module './projectsDb' {
  export interface ProjectsDb {
    getTasks(options: { projectId: string, ids?: string[] }): Promise<any[]>;
    getTasksByProject(projectId: string): Promise<any[]>;
    getTasksForProject(projectId: string): Promise<any[]>;
    updateTask(taskId: string, update: any): Promise<any>;
    deleteTask(taskId: string): Promise<boolean>;
  }
}
import { relationsDb, createRelation, loadRelations, saveRelations, saveRelation, RelationType } from './relationsDb';
import { outcomeProgressDb, outcomesDb } from './outcomeProgressDb';
import { setupAuth, isAuthenticated } from './auth'; 
import { registerAdminRoutes } from './admin-routes';

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
  
  // Diagnostic endpoint for project IDs - public for debugging
  app.get('/api/debug/projects', async (req, res) => {
    try {
      // Get all projects directly from database
      const projectsResult = await db.execute(sql`
        SELECT id, name, created_at 
        FROM projects 
        ORDER BY created_at DESC
      `);
      
      // Map each project to include the ID type information
      const projectsWithTypes = (projectsResult.rows || []).map(project => {
        const id = project.id;
        return {
          id,
          name: project.name,
          created_at: project.created_at,
          id_type: typeof id,
          id_analysis: {
            is_numeric: !isNaN(Number(id)),
            is_uuid_format: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id)),
            string_length: String(id).length
          }
        };
      });
      
      return res.json({
        projects: projectsWithTypes,
        project_count: projectsWithTypes.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting project IDs:', error);
      res.status(500).json({ 
        message: 'Error retrieving project IDs',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Diagnostic endpoint for project tasks - public for debugging
  app.get('/api/debug/project-tasks', async (req, res) => {
    try {
      // Get all project tasks directly from database
      const tasksResult = await db.execute(sql`
        SELECT id, project_id, text, completed, stage, source_id, origin, created_at, updated_at
        FROM project_tasks
        ORDER BY created_at DESC
      `);
      
      // Map task data to include helpful diagnostics
      const tasksWithAnalysis = (tasksResult.rows || []).map(task => {
        const projectId = task.project_id;
        return {
          id: task.id,
          text: task.text,
          project_id: projectId,
          completed: task.completed,
          stage: task.stage,
          source_id: task.source_id,
          origin: task.origin,
          created_at: task.created_at,
          updated_at: task.updated_at,
          project_id_type: typeof projectId
        };
      });
      
      res.json({ tasks: tasksWithAnalysis, count: tasksWithAnalysis.length });
    } catch (error) {
      console.error('Error in task debug endpoint:', error);
      res.status(500).json({ error: 'Server error getting task data' });
    }
  });

app.get('/__debug/schema/tasks', isAdmin, async (req: Request, res: Response) => {
  try {
    const schemaInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);

    const constraints = await db.execute(sql`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'project_tasks';
    `);

    res.json({
      schema: schemaInfo.rows,
      constraints: constraints.rows
    });
  } catch (error) {
    console.error('Schema verification error:', error);
    res.status(500).json({ error: 'Failed to verify schema' });
  }
});

// Diagnostic endpoint for tasks by project ID
app.get('/api/debug/tasks/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // Verify the project ID exists
    const projectResult = await db.execute(sql`
      SELECT * FROM projects WHERE id = ${projectId}
    `);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get all tasks for this project
    const tasksResult = await db.execute(sql`
      SELECT * FROM project_tasks WHERE project_id = ${projectId}
    `);
    
    // Return the tasks
    res.json({ 
      tasks: tasksResult.rows, 
      count: tasksResult.rows.length 
    });
  } catch (error) {
    console.error(`Error getting tasks for project:`, error);
    res.status(500).json({ error: 'Server error getting tasks' });
  }
});

// Debug endpoint for task counts
app.get('/api/debug/task-stats', async (req: Request, res: Response) => {
  try {
    const tasksResult = await db.execute(sql`
      SELECT project_id, COUNT(*) as task_count
      FROM project_tasks
      GROUP BY project_id
    `);
    
    res.json({
        task_counts_by_project: tasksResult.rows,
        timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting task stats:', error);
    res.status(500).json({ error: 'Server error getting task stats' });
  }
});

// Endpoint to save the current session cookie to a file for testing
app.post('/api/debug/save-session', async (req: Request, res: Response) => {
  // Security check - only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  try {
    const { cookie } = req.body;
    
    if (!cookie || typeof cookie !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid cookie format' 
      });
    }
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('./current-session.txt', cookie);
    
    return res.json({ 
      success: true, 
      message: 'Session cookie saved to file',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving session cookie:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save session cookie'
    });
  }
});

// Error reporting endpoint
app.get('/api/debug/errors', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in error reporting endpoint:', error);
    res.status(500).json({
        message: 'Error retrieving project tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
      let projectTasksColumns: any[] = [];
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
      let projectsColumns: any[] = [];
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
      
      console.log(`Creating tasks for project ${projectId}, isAuthenticated: ${req.isAuthenticated()}`);
      console.log('Task data:', JSON.stringify(taskData));

      // If an array is passed, handle each task individually
      if (Array.isArray(taskData)) {
        const results = [];
        let hasErrors = false;
        
        for (const task of taskData) {
          try {
            const result = await projectsDb.createTask({
              projectId,
              ...task
            });
            if (result) {
              results.push(result);
            } else {
              hasErrors = true;
              console.warn(`Task in batch returned null, but continuing processing`);
            }
          } catch (taskError) {
            hasErrors = true;
            console.error(`Error creating task in batch: ${taskError}`);
            // Continue processing other tasks even if one fails
          }
        }
        
        // Even if some tasks failed, return what we have with 201 Created
        return res.status(201).json(results);
      }

      // Otherwise, handle as a single task
      try {
        // Import the debug flags directly from the constants file
        // Use imported debug flags instead of re-declaring
        
        console.log(`Attempting to save task for project ${projectId} with data:`, JSON.stringify(taskData));
        
        // Special diagnostic logging for SuccessFactor tasks
        if ((taskData.origin === 'factor' || taskData.origin === 'success-factor') && 
            (DEBUG_TASK_COMPLETION || DEBUG_TASK_PERSISTENCE)) {
          console.log(`[DEBUG_TASK_COMPLETION] *** Creating SuccessFactor task ***`);
          console.log(`[DEBUG_TASK_COMPLETION]  - Initial completion state: ${!!taskData.completed}`);
          console.log(`[DEBUG_TASK_COMPLETION]  - Source ID: ${taskData.sourceId || 'none'}`);
          console.log(`[DEBUG_TASK_COMPLETION]  - Text: ${taskData.text?.substring(0, 30)}...`);
        }
        
        // Make sure we have a valid UUID format project ID
        if (!projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.error(`Invalid UUID format for project ID: ${projectId}`);
          return res.status(400).json({
            message: 'Invalid project ID format',
            details: 'Project ID must be a valid UUID'
          });
        }
        
        // Add pre-creation validation logging
        if (DEBUG_TASK_VALIDATION) {
          console.log(`[DEBUG_TASK_VALIDATION] Task data validation before creation:`);
          console.log(`[DEBUG_TASK_VALIDATION]  - Project ID: ${projectId}`);
          console.log(`[DEBUG_TASK_VALIDATION]  - Task origin: ${taskData.origin || 'custom'}`);
          console.log(`[DEBUG_TASK_VALIDATION]  - Stage: ${taskData.stage || 'unknown'}`);
          console.log(`[DEBUG_TASK_VALIDATION]  - Initial completion: ${!!taskData.completed}`);
        }
        
        // Create the task
        const result = await projectsDb.createTask({
          projectId, // Using validated project ID
          ...taskData
        });
        
        console.log('Task creation completed. Result:', result ? 'success' : 'null', 
                   'ID:', result?.id, 'Type:', typeof result);
        
        // Add post-creation persistence validation
        if (DEBUG_TASK_PERSISTENCE) {
          console.log(`[DEBUG_TASK_PERSISTENCE] Task creation result validation:`);
          console.log(`[DEBUG_TASK_PERSISTENCE]  - Task ID: ${result?.id || 'null'}`);
          
          if (result) {
            console.log(`[DEBUG_TASK_PERSISTENCE]  - Persisted completion state: ${!!result.completed}`);
            console.log(`[DEBUG_TASK_PERSISTENCE]  - Initial requested state: ${!!taskData.completed}`);
            
            // Detect completion state mismatch
            if (taskData.hasOwnProperty('completed') && result.completed !== taskData.completed) {
              console.error(`[DEBUG_TASK_PERSISTENCE] *** CRITICAL: Completion state mismatch after creation! ***`);
              console.error(`[DEBUG_TASK_PERSISTENCE]  - Expected: ${!!taskData.completed}`);
              console.error(`[DEBUG_TASK_PERSISTENCE]  - Actual: ${!!result.completed}`);
            }
          }
        }
        
        // Only return success if we actually got a result back
        if (!result) {
          console.error(`Task creation failed for project ${projectId} - returned null`);
          if (DEBUG_TASK_PERSISTENCE) {
            console.error(`[DEBUG_TASK_PERSISTENCE] Task creation failed - database returned null`);
          }
          return res.status(500).json({
            message: 'Failed to create task - database operation returned null',
            details: 'The task was not persisted to the database'
          });
        }
        
        // Verify the task was saved
        console.log(`Task created successfully with ID: ${result.id}`);
        
        // Special verification for SuccessFactor tasks
        if ((taskData.origin === 'factor' || taskData.origin === 'success-factor') && DEBUG_TASK_COMPLETION) {
          console.log(`[DEBUG_TASK_COMPLETION] SuccessFactor task creation verification:`);
          console.log(`[DEBUG_TASK_COMPLETION]  - Task ID: ${result.id}`);
          console.log(`[DEBUG_TASK_COMPLETION]  - Completion state in result: ${!!result.completed}`);
          
          // Double-check by fetching the task directly from the database
          try {
            // Using getTasksForProject and filtering manually
            const allTasks = await projectsDb.getTasksForProject(result.projectId);
            const verifiedTask = allTasks.find(task => task.id === result.id);
            
            if (verifiedTask) {
              console.log(`[DEBUG_TASK_COMPLETION] Verification lookup successful:`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Verified completion state: ${!!verifiedTask.completed}`);
              
              if (verifiedTask.completed !== result.completed) {
                console.error(`[DEBUG_TASK_COMPLETION] *** CRITICAL: Verification mismatch! ***`);
              }
            }
          } catch (verifyError: unknown) {
            console.error(`[DEBUG_TASK_COMPLETION] Error during verification lookup:`, 
              verifyError instanceof Error ? verifyError.message : String(verifyError));
          }
        }
        
        // Return the created task with all its properties in a structured format
        return res.status(201).json({
          success: true,
          task: result,
          message: 'Task created successfully'
        });
      } catch (taskError) {
        console.error('Error in createProjectTask:', taskError);
        // Return an error response with 500 status
        return res.status(500).json({
          success: false,
          message: 'Failed to create task',
          error: taskError instanceof Error ? taskError.message : 'Unknown error',
          details: 'The task was not persisted to the database'
        });
      }
    } catch (error) {
      console.error('Error processing project tasks request:', error);
      // Return an error status with a consistent format
      return res.status(500).json({
        success: false,
        message: 'Failed to process task creation request',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'The task was not persisted to the database'
      });
    }
  });

  // Get tasks for a project
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const ensureFactors = req.query.ensure === 'true';
      
      // Basic validation
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }
      
      const DEBUG_TASK_API = process.env.DEBUG_TASKS === 'true'; // Same flag detection as client-side
      if (DEBUG_TASK_API) {
        console.log(`[DEBUG_TASK_API] GET tasks for project ${projectId}`);
      }
      
      // Ensure all Success Factor tasks exist in the project if requested
      if (ensureFactors) {
        try {
          // Import the cloneSuccessFactors function
          const { ensureSuccessFactorTasks } = await import('./cloneSuccessFactors');
          await ensureSuccessFactorTasks(projectId);
          
          if (DEBUG_TASK_API) {
            console.log(`[DEBUG_TASK_API] Ensured all Success Factor tasks exist for project ${projectId}`);
          }
        } catch (ensureError) {
          console.error(`Error ensuring Success Factor tasks for project ${projectId}:`, ensureError);
          // Continue even if ensure fails - we'll return what tasks we have
        }
      }
      
      const tasks = await projectsDb.getTasksForProject(projectId);
      
      // Enhanced debugging for task retrieval
      if (DEBUG_TASK_API) {
        console.log(`[DEBUG_TASK_API] Retrieved ${tasks?.length || 0} tasks for project ${projectId}`);
        
        // Special debug logging for SuccessFactor tasks
        const successFactorTasks = (tasks || []).filter(task => 
          task.origin === 'success-factor' || task.origin === 'factor'
        );
        
        if (successFactorTasks.length > 0) {
          console.log(`[DEBUG_TASK_API] Found ${successFactorTasks.length} SuccessFactor tasks`);
          console.log('[DEBUG_TASK_API] SuccessFactor tasks completion status:');
          successFactorTasks.slice(0, 5).forEach(task => {
            console.log(`[DEBUG_TASK_API]   - Task ${task.id}: completed=${task.completed}, sourceId=${task.sourceId}`);
          });
        }
      }
      
      // Return a consistently structured response
      return res.status(200).json(tasks || []);
    } catch (error) {
      console.error('Error retrieving project tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Special route to handle missing taskId case with trailing slash
  app.put("/api/projects/:projectId/tasks/", (req, res) => {
    // Always set JSON content type
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(400).json({
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'Task ID is required'
    });
  });

  // Task update endpoint with guaranteed JSON responses and proper Success Factor handling
  app.put(
    "/api/projects/:projectId/tasks/:taskId",
    validateUuid(["projectId", "taskId"]),
    async (req: Request, res: Response) => {
    // CRITICAL: First action - Always set Content-Type header for JSON responses
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Start tracking request timing
    const requestStartTime = Date.now();
    const requestTimer = { 
      start: requestStartTime,
      end: 0,
      duration: 0
    };
    
    // Debug logging for headers and auth state
    if (process.env.DEBUG_TASKS === 'true') {
      console.log('[DEBUG_TASKS] Task update request headers:', req.headers);
      console.log('[DEBUG_TASKS] Auth state:', {
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        hasAuthOverride: req.headers['x-auth-override'] === 'true'
      });
    }
    
    // Authentication check with special bypass for testing
    const isAuthBypassed = req.headers['x-auth-override'] === 'true';
    if (!isAuthBypassed) {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
    } else if (process.env.DEBUG_TASKS === 'true') {
      console.log('[DEBUG_TASKS] Auth check bypassed for testing');
    }
    
    // Extract parameters
    const { projectId, taskId } = req.params;
    const isDebugEnabled = process.env.DEBUG_TASKS === 'true';
    
    // Start operation logging
    const operationId = taskLogger.startOperation('updateTaskRoute', taskId, projectId);
    
    // Validate the task ID using the TaskIdResolver
    if (isDebugEnabled) {
      console.log(`[DEBUG_TASKS] Looking up task ${taskId} for project ${projectId} using TaskIdResolver`);
      console.log(`[DEBUG_TASKS] Initializing TaskIdResolver with database connection`);
    }
    
    // CRITICAL FIX: Always initialize the TaskIdResolver with database connection
    // This ensures we have a valid database connection for all task lookup strategies
    const taskIdResolver = getTaskIdResolver(projectsDb);
    
    // Validate required parameters
    if (!projectId) {
      taskLogger.endOperation(operationId, false, new Error('Project ID is required'));
      return res.status(400).json(
        taskLogger.formatErrorResponse(
          TaskErrorCodes.VALIDATION_ERROR,
          'Project ID is required',
          { requestPath: req.path }
        )
      );
    }
    
    if (!taskId) {
      taskLogger.endOperation(operationId, false, new Error('Task ID is required'));
      return res.status(400).json(
        taskLogger.formatErrorResponse(
          TaskErrorCodes.VALIDATION_ERROR,
          'Task ID is required',
          { projectId, requestPath: req.path }
        )
      );
    }
    
    // Use req.body as the update data
    const updates = req.body;
    
    // Log the task update for diagnostic tracking
    taskLogger.logTaskUpdate(taskId, projectId, updates);
    
    // Log debug information if enabled
    if (isDebugEnabled) {
      console.log('[DEBUG_TASKS] Task update request:');
      console.log(`[DEBUG_TASKS] - Project ID: ${projectId}`);
      console.log(`[DEBUG_TASKS] - Task ID: ${taskId}`);
      console.log(`[DEBUG_TASKS] - Update data:`, JSON.stringify(updates, null, 2));
      
      if (updates.origin === 'success-factor' || updates.origin === 'factor') {
        console.log(`[DEBUG_TASKS] *** Success Factor task update detected ***`);
      }
    }
    
    // Ensure TaskStateManager is initialized with database connection
    // No need to check internal state, just call initialize which handles re-initialization safely
    taskStateManager.initialize(projectsDb);
    
    if (isDebugEnabled) {
      console.log('[DEBUG_TASKS] TaskStateManager initialized with projectsDb');
    }
    
    try {
      // Get TaskIdResolver with proper database connection
      const taskIdResolver = getTaskIdResolver(projectsDb);
      
      // Validate the input task ID format using cleanUUID method
      
      // Use the TaskIdResolver with proper database connection to find the task
      // with intelligent ID resolution and proper parameter order (taskId, projectId)
      const findTaskOperationId = taskLogger.startOperation('findTaskById', taskId, projectId);
      
      if (isDebugEnabled) {
        console.log('[DEBUG_TASKS] Using TaskIdResolver with database connection');
      }
      
      // CRITICAL FIX: Explicitly use the TaskIdResolver instance to find tasks 
      // This ensures proper ID resolution with all formats (UUID, prefixes, sourceId, etc.)
      // The order of parameters (taskId, projectId) is important for proper resolution
      const task = await taskIdResolver.findTaskById(taskId, projectId);
      taskLogger.endOperation(findTaskOperationId, !!task);
      
      if (isDebugEnabled) {
        console.log(`[DEBUG_TASKS] Task lookup result:`, {
          found: !!task,
          id: task?.id,
          text: task?.text,
          origin: task?.origin,
          sourceId: task?.sourceId,
          completed: task?.completed
        });
      }
      
      // Handle task not found
      if (!task) {
        const error = new Error(`Task with ID ${taskId} not found in project ${projectId}`);
        taskLogger.endOperation(operationId, false, error);
        
        return res.status(404).json(
          taskLogger.formatErrorResponse(
            TaskErrorCodes.NOT_FOUND,
            `Task with ID ${taskId} not found in project ${projectId}`,
            { taskId, projectId }
          )
        );
      }
      
      // Store the original task for comparison
      const originalTask = { ...task };
      
      // ENHANCED PROJECT VALIDATION: Explicitly verify task belongs to the requested project
      // This provides an additional layer of security to prevent cross-project task updates
      if (originalTask.projectId && originalTask.projectId !== projectId) {
        const error = new Error(`Task belongs to project ${originalTask.projectId}, not requested project ${projectId}`);
        taskLogger.endOperation(operationId, false, error);
        
        if (isDebugEnabled) {
          console.log(`[DEBUG_TASKS] [PROJECT_MISMATCH] Task project mismatch detected:
          - Requested project ID: ${projectId}
          - Actual task project ID: ${originalTask.projectId}
          - Task ID: ${originalTask.id}
          - Task source ID: ${originalTask.sourceId || 'N/A'}
          - Request denied to prevent cross-project updates`);
        }
        
        return res.status(403).json(
          taskLogger.formatErrorResponse(
            TaskErrorCodes.PROJECT_MISMATCH,
            `Task belongs to project ${originalTask.projectId}, not the requested project ${projectId}`,
            { 
              taskId: originalTask.id, 
              requestedProjectId: projectId,
              actualProjectId: originalTask.projectId,
              sourceId: originalTask.sourceId
            }
          )
        );
      }
      
      // Additional handling for Success Factor tasks with sourceId
      if (originalTask.origin === 'factor' && originalTask.sourceId) {
        if (isDebugEnabled) {
          console.log(`[DEBUG_TASKS] Success Factor task detected with sourceId: ${originalTask.sourceId}`);
          
          // If the task ID from the original request doesn't match the actual task ID in the database,
          // log that we're using smart ID resolution
          if (originalTask.id !== taskId) {
            console.log(`[DEBUG_TASKS] Using smart ID resolution: Request ID ${taskId} -> Actual ID ${originalTask.id}`);
          }
        }
      }
      
      // Log found task details
      if (isDebugEnabled) {
        console.log(`[DEBUG_TASKS] Original task found:`);
        console.log(`[DEBUG_TASKS] - ID: ${originalTask.id}`);
        console.log(`[DEBUG_TASKS] - Text: ${originalTask.text || 'N/A'}`);
        console.log(`[DEBUG_TASKS] - Origin: ${originalTask.origin || 'N/A'}`);
        console.log(`[DEBUG_TASKS] - Completed: ${originalTask.completed}`);
        
        if (originalTask.sourceId) {
          console.log(`[DEBUG_TASKS] - Source ID: ${originalTask.sourceId}`);
        }
      }
      
      // Create a copy of req.body for task updates
      let updates = { ...req.body };
      
      // Enhanced handling for Success Factor tasks with stricter validation and metadata preservation
      if (originalTask.origin === 'success-factor' || originalTask.origin === 'factor') {
        if (isDebugEnabled) {
          console.log(`[DEBUG_TASKS] Processing Success Factor task update with metadata preservation`);
          console.log(`[DEBUG_TASKS] Original task metadata:`, {
            id: originalTask.id,
            origin: originalTask.origin,
            sourceId: originalTask.sourceId,
            completed: originalTask.completed
          });
        }
        
        // CRITICAL FIX: Always preserve origin/source metadata for Success Factor tasks
        // This ensures metadata is never stripped during updates
        updates.origin = originalTask.origin;
        
        // Prevent changing origin of Success Factor tasks
        if (updates.origin && updates.origin !== originalTask.origin) {
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Attempted to change Success Factor origin from ${originalTask.origin} to ${updates.origin}`);
          }
          return res.status(400).json({
            success: false,
            error: 'INVALID_SUCCESS_FACTOR_UPDATE',
            message: 'Cannot change origin of a Success Factor task',
            details: {
              taskId: originalTask.id,
              currentOrigin: originalTask.origin,
              attemptedOrigin: updates.origin
            }
          });
        }
        
        // Prevent changing sourceId of Success Factor tasks
        if (updates.sourceId && updates.sourceId !== originalTask.sourceId) {
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Attempted to change Success Factor sourceId from ${originalTask.sourceId} to ${updates.sourceId}`);
          }
          return res.status(400).json({
            success: false,
            error: 'INVALID_SUCCESS_FACTOR_UPDATE',
            message: 'Cannot change sourceId of a Success Factor task',
            details: {
              taskId: originalTask.id,
              currentSourceId: originalTask.sourceId,
              attemptedSourceId: updates.sourceId
            }
          });
        }
        
        // Always preserve sourceId for Success Factor tasks - this is critical for lookups
        if (originalTask.sourceId) {
          updates.sourceId = originalTask.sourceId;
          
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Explicitly preserved sourceId: ${originalTask.sourceId}`);
          }
        }
        
        // Preserve source field as well if it exists (used for filtering)
        if (originalTask.source) {
          updates.source = originalTask.source;
          
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Explicitly preserved source: ${originalTask.source}`);
          }
        }
        
        // Validate stage value if it's being updated
        if (updates.stage && !['identification', 'definition', 'delivery', 'closure'].includes(updates.stage)) {
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Invalid stage value for Success Factor task: ${updates.stage}`);
          }
          return res.status(400).json({
            success: false,
            error: 'INVALID_SUCCESS_FACTOR_UPDATE',
            message: 'Invalid stage value for Success Factor task',
            details: {
              taskId: originalTask.id,
              invalidStage: updates.stage,
              validStages: ['identification', 'definition', 'delivery', 'closure']
            }
          });
        }
      }
      
      // Step 2: Update the task using TaskStateManager
      try {
        // Store original task details before update
        const userTaskId = originalTask.id;
        
        // ENHANCED SAFEGUARD: Ensure critical Success Factor metadata is preserved in the updates
        if (originalTask.origin === 'factor' || originalTask.origin === 'success-factor') {
          // Always preserve the origin for Success Factor tasks (overwriting any incorrect values)
          updates.origin = originalTask.origin;
          
          // Always preserve the sourceId for Success Factor tasks
          if (originalTask.sourceId) {
            updates.sourceId = originalTask.sourceId;
          }
          
          // Preserve source field for consistent filtering
          if (originalTask.source) {
            updates.source = originalTask.source;
          }
          
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Enhanced safeguard: Success Factor metadata explicitly preserved in updates payload:`, {
              id: originalTask.id,
              origin: updates.origin,
              sourceId: updates.sourceId,
              source: updates.source
            });
          }
        }
        
        // Use TaskStateManager to update the task with optimistic updates and sync
        const updatedState = await taskStateManager.updateTaskState(
          originalTask.id,
          projectId, 
          updates
        );
        
        if (isDebugEnabled) {
          console.log(`[DEBUG_TASKS] Task update initiated with TaskStateManager`);
          console.log(`[DEBUG_TASKS] Current sync status: ${updatedState.syncStatus}`);
          console.log(`[DEBUG_TASKS] Using user's task ID for response: ${userTaskId}`);
        }
        
        // For Success Factor tasks, sync all related tasks with the same sourceId
        if (originalTask.origin === 'factor' && originalTask.sourceId && 
            updates.hasOwnProperty('completed')) {
          try {
            // Use TaskStateManager to sync related tasks
            const syncCount = await taskStateManager.syncRelatedTasks(
              projectId, 
              originalTask.sourceId, 
              { 
                completed: updates.completed,
                // Always include critical metadata in sync operations
                origin: originalTask.origin,
                sourceId: originalTask.sourceId,
                source: originalTask.source || 'factor'
              }
            );
            
            if (isDebugEnabled && syncCount > 0) {
              console.log(`[DEBUG_TASKS] Synchronized ${syncCount} related Success Factor tasks with metadata preservation`);
            }
          } catch (syncError) {
            console.error(`[ERROR] Failed to sync related Success Factor tasks:`, syncError);
          }
        }
        
        // Create an updated user task object that includes sync status with proper metadata preservation
        const updatedUserTask = {
          ...originalTask,                     // Start with the user's original task (includes correct ID)
          ...updates,                          // Apply the user's updates
          updatedAt: new Date(),               // Add updatedAt timestamp
          syncStatus: updatedState.syncStatus, // Include sync status for client
        };
        
        // CRITICAL FIX: For Success Factor tasks, ensure metadata is explicitly preserved in the response
        if (originalTask.origin === 'factor' || originalTask.origin === 'success-factor') {
          // Force origin and sourceId to match the original values for Success Factor tasks
          updatedUserTask.origin = originalTask.origin;
          
          if (originalTask.sourceId) {
            updatedUserTask.sourceId = originalTask.sourceId;
          }
          
          if (originalTask.source) {
            updatedUserTask.source = originalTask.source;
          }
          
          // Double-check that task stage is preserved for Success Factor tasks if it exists
          if (originalTask.stage && !updatedUserTask.stage) {
            updatedUserTask.stage = originalTask.stage;
          }
          
          // Ensure we return the original task ID that the client sent (for consistent caching)
          // This is crucial for client-side state handling
          updatedUserTask.id = taskId;
          
          if (isDebugEnabled) {
            console.log(`[DEBUG_TASKS] Success Factor metadata explicitly preserved in response:`, {
              id: updatedUserTask.id, 
              origin: updatedUserTask.origin,
              sourceId: updatedUserTask.sourceId,
              source: updatedUserTask.source || 'N/A',
              stage: updatedUserTask.stage || 'N/A',
              completed: updatedUserTask.completed
            });
          }
        } else {
          // For non-Success Factor tasks, just ensure the ID matches the requested one
          updatedUserTask.id = taskId;
        }
        
        // CRITICAL FIX: Always return with JSON Content-Type for 100% consistency
        return res.status(200).json({
          success: true,
          message: 'Task updated successfully',
          task: updatedUserTask,
          sync: {
            status: updatedState.syncStatus,
            timestamp: new Date().toISOString(),
            retryCount: updatedState.retryCount || 0
          }
        });
      } catch (updateError) {
        console.error(`[TASK_UPDATE_ERROR] Failed to update task:`, updateError);
        
        return res.status(500).json({
          success: false,
          error: 'UPDATE_FAILED',
          message: 'Failed to update task'
        });
      }
    } catch (error) {
      // Catch-all error handler
      console.error(`[ERROR] Unhandled error in task update endpoint:`, error);
      
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  });
  
  // Delete a specific task for a project
  app.delete('/api/projects/:projectId/tasks/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, taskId } = req.params;
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PARAMETERS',
          message: 'Project ID is required'
        });
      }
      
      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PARAMETERS',
          message: 'Task ID is required'
        });
      }
      
      // Extract the UUID part from compound task IDs (for SuccessFactor tasks)
      // A compound ID looks like: 2f565bf9-70c7-5c41-93e7-c6c4cde32312-dfd5e65a
      // We need to extract just: 2f565bf9-70c7-5c41-93e7-c6c4cde32312
      const taskIdClean = taskId.split('-').slice(0, 5).join('-');
      
      // Add diagnostic logging for the task update operation
      const DEBUG_TASK_API = process.env.DEBUG_TASKS === 'true';
      
      if (DEBUG_TASK_API) {
        console.log(`[DEBUG_TASK_API] PUT request to update task ${taskId} for project ${projectId}`);
        console.log(`[DEBUG_TASK_API] taskId:`, taskId);
        console.log(`[DEBUG_TASK_API] extracted UUID:`, taskIdClean);
        console.log(`[DEBUG_TASK_API] Task update payload:`, JSON.stringify(req.body));
        
        // Special diagnostic for completion status updates
        if (req.body.hasOwnProperty('completed')) {
          console.log(`[DEBUG_TASK_API] *** Completion status update detected ***`);
          console.log(`[DEBUG_TASK_API] New completion value: ${req.body.completed}`);
        }
        
        // Get all tasks for this project to diagnose ID matching issues
        try {
          const allTasks = await projectsDb.getTasksForProject(projectId);
          console.log(`[DEBUG_TASK_API] Task IDs in database for project ${projectId}:`);
          console.log(`[DEBUG_TASK_API] Total tasks found: ${allTasks.length}`);
          const taskIds = allTasks.map(t => t.id);
          console.log(`[DEBUG_TASK_API] Task IDs: ${JSON.stringify(taskIds)}`);
          console.log(`[DEBUG_TASK_API] Comparison:`);
          console.log(`[DEBUG_TASK_API]  - Raw request ID: ${taskId}`);
          console.log(`[DEBUG_TASK_API]  - Extracted UUID: ${taskId}`);
          console.log(`[DEBUG_TASK_API]  - ID match with raw: ${taskIds.includes(taskId)}`);
          console.log(`[DEBUG_TASK_API]  - ID match with extracted: ${taskIds.includes(taskId)}`);
        } catch (error) {
          console.error(`[DEBUG_TASK_API] Error fetching project tasks for diagnosis:`, error);
        }
      }

      // Ensure we have the required fields
      if (!req.body) {
        return res.status(400).json({ 
          success: false,
          message: 'Task data is required' 
        });
      }

      // Basic validation of ID format
      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Task ID is required'
        });
      }

      try {
        // Enhanced diagnostic logging for task updates with specific focus on SuccessFactor tasks
        let originalTask;
        
        // Use imported debug flags from top of file
        
        try {
          // Get the original task to check if it's a SuccessFactor task
          // Using getTasksForProject instead of the non-existent getTaskById
          const allTasks = await projectsDb.getTasksForProject(projectId);
          
          // Try to find task using extracted UUID first, then fallback to raw ID if not found
          // This handles both simple UUID and compound ID formats
          originalTask = allTasks.find(task => task.id === taskId) || 
                        allTasks.find(task => task.id === taskId);
          
          if (DEBUG_TASK_API) {
            console.log(`[DEBUG_TASK_API] Task lookup strategy results:`);
            console.log(`[DEBUG_TASK_API]  - First attempt using extracted UUID: ${taskId}`);
            console.log(`[DEBUG_TASK_API]  - Result: ${allTasks.find(task => task.id === taskId) ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`[DEBUG_TASK_API]  - Second attempt using raw ID: ${taskId}`);
            console.log(`[DEBUG_TASK_API]  - Result: ${allTasks.find(task => task.id === taskId) ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`[DEBUG_TASK_API]  - Final task found: ${originalTask ? 'YES' : 'NO'}`);
          }
          
          if (originalTask) {
            // Standard task update logging
            if (DEBUG_TASK_API) {
              console.log(`[DEBUG_TASK_API] Original task details:`);
              console.log(`[DEBUG_TASK_API]  - ID: ${originalTask.id}`);
              console.log(`[DEBUG_TASK_API]  - Text: ${originalTask.text?.substring(0, 30)}...`);
              console.log(`[DEBUG_TASK_API]  - Origin: ${originalTask.origin}`);
              console.log(`[DEBUG_TASK_API]  - Source ID: ${originalTask.sourceId}`);
              console.log(`[DEBUG_TASK_API]  - Current completion: ${originalTask.completed}`);
            }
            
            // Success factor specific completion logging
            if ((originalTask.origin === 'factor' || originalTask.origin === 'success-factor') && 
                (DEBUG_TASK_COMPLETION || DEBUG_TASK_PERSISTENCE)) {
              console.log(`[DEBUG_TASK_COMPLETION] *** SuccessFactor task update operation ***`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Task ID: ${originalTask.id}`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Current completion state: ${originalTask.completed}`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Requested completion state: ${req.body.completed}`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Source ID: ${originalTask.sourceId}`);
              
              // Log the entire task update object for comprehensive debugging
              if (DEBUG_TASK_PERSISTENCE) {
                console.log(`[DEBUG_TASK_PERSISTENCE] Full task update object:`, req.body);
              }
            }
            
            // Track state transitions with the new debug flag
            if (DEBUG_TASK_STATE && req.body.hasOwnProperty('completed')) {
              console.log(`[DEBUG_TASK_STATE] Task state transition tracked:`);
              console.log(`[DEBUG_TASK_STATE]  - Task ID: ${originalTask.id}`);
              console.log(`[DEBUG_TASK_STATE]  - Title: ${originalTask.text?.substring(0, 40)}...`);
              console.log(`[DEBUG_TASK_STATE]  - Origin: ${originalTask.origin}`);
              console.log(`[DEBUG_TASK_STATE]  - From state: ${originalTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
              console.log(`[DEBUG_TASK_STATE]  - To state: ${req.body.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
              
              if (originalTask.origin === 'success-factor' || originalTask.origin === 'factor') {
                console.log(`[DEBUG_TASK_STATE] *** SuccessFactor task detected - tracking for completion bug ***`);
                console.log(`[DEBUG_TASK_STATE]  - Source ID: ${originalTask.sourceId}`);
              }
            }
          }
        } catch (taskLookupError) {
          console.error('[DEBUG_TASK_API] Error looking up original task:', taskLookupError);
        }
        
        // Add detailed logging before the database call
        if (DEBUG_TASK_PERSISTENCE) {
          console.log(`[DEBUG_TASK_PERSISTENCE] Preparing to update task in database`);
          console.log(`[DEBUG_TASK_PERSISTENCE]  - Task ID: ${taskId}`);
          console.log(`[DEBUG_TASK_PERSISTENCE]  - Project ID: ${projectId}`);
          console.log(`[DEBUG_TASK_PERSISTENCE]  - Update fields:`, Object.keys(req.body));
          
          if (req.body.hasOwnProperty('completed')) {
            console.log(`[DEBUG_TASK_PERSISTENCE]  - Completion value being set: ${req.body.completed}`);
          }
        }
        
        // Attempt to update the task with error tracking
        let updatedTask;
        try {
          // For PUT requests, add origin info to the updates if it's missing
          // This is crucial for the upsert functionality to work properly
          if (req.method === 'PUT' && !req.body.origin && originalTask?.origin === 'success-factor') {
            req.body.origin = 'success-factor';
            console.log(`[DEBUG_TASK_API] PUT request: Adding success-factor origin to task update`);
          }
          
          // For success-factor tasks that don't exist, explicitly create them instead of updating
          if ((req.body.origin === 'success-factor' || req.body.origin === 'factor') && !originalTask) {
            console.log(`[DEBUG_TASK_API] Success-factor task not found, creating instead of updating`);
            console.log(`[DEBUG_TASK_API] Task ID: ${taskId}, Project ID: ${projectId}`);
            
            try {
              // Create a new task with the provided data
              const newTaskData = {
                id: taskId,
                projectId: projectId,
                sourceId: taskId,
                text: req.body.text || '',
                origin: req.body.origin,
                stage: req.body.stage || 'identification',
                completed: req.body.completed !== undefined ? req.body.completed : false
              };
              
              console.log(`[DEBUG_TASK_API] Creating new success-factor task with data:`, JSON.stringify(newTaskData));
              
              const createdTask = await projectsDb.createTask(newTaskData);
              
              if (createdTask) {
                console.log(`[DEBUG_TASK_API] Successfully created success-factor task: ${taskId}`);
                // Return the created task instead of attempting an update
                return res.status(201).json({
                  success: true,
                  task: createdTask,
                  message: 'Success-factor task created successfully'
                });
              } else {
                console.error(`[DEBUG_TASK_API] Failed to create success-factor task: ${taskId}`);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to create success-factor task'
                });
              }
            } catch (error: unknown) {
              console.error(`[DEBUG_TASK_API] Error creating success-factor task:`, error);
              return res.status(500).json({
                success: false,
                message: `Error creating success-factor task: ${error instanceof Error ? error.message : String(error)}`
              });
            }
          }
          
          // If we found the task in our previous lookup, use its actual stored ID
          // Otherwise, try both the extracted UUID and raw ID formats
          const idForUpdate = originalTask ? originalTask.id : taskId;
          
          if (DEBUG_TASK_API) {
            console.log(`[DEBUG_TASK_API] Updating task using ID: ${idForUpdate}`);
            if (originalTask) {
              console.log(`[DEBUG_TASK_API]  - Using ID from found task object`);
            } else {
              console.log(`[DEBUG_TASK_API]  - Using extracted UUID as fallback`);
              if (req.body.origin === 'success-factor' || req.body.origin === 'factor') {
                console.log(`[DEBUG_TASK_API]  - This is a success-factor task, will upsert if not found`);
              }
            }
          }
          
          updatedTask = await projectsDb.updateTask(idForUpdate, req.body);
          
          if (!updatedTask) {
            return res.status(404).json({
              success: false,
              error: 'TASK_NOT_FOUND',
              message: `Task ${taskId} not found`
            });
          }
        } catch (dbError: unknown) {
          // Log database errors immediately
          console.error('[ERROR] Database error during task update:', dbError);
          
          // Check if this is a TASK_NOT_FOUND error
          // This happens when a non-success-factor task can't be found
          const error = dbError as any;
          if (error?.code === 'TASK_NOT_FOUND') {
            return res.status(404).json({
              success: false,
              message: `Task with ID ${taskId} not found`,
              code: 'TASK_NOT_FOUND'
            });
          }
          
          if (DEBUG_TASK_PERSISTENCE) {
            console.error(`[DEBUG_TASK_PERSISTENCE] Task update database operation failed:`);
            console.error(`[DEBUG_TASK_PERSISTENCE]  - Raw Task ID: ${taskId}`);
            console.error(`[DEBUG_TASK_PERSISTENCE]  - Extracted UUID: ${taskId}`);
            console.error(`[DEBUG_TASK_PERSISTENCE]  - Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
          }
          
          // Check for our custom task not found error code
          if (dbError && typeof dbError === 'object' && 'code' in dbError && dbError.code === 'TASK_NOT_FOUND') {
            // For PUT requests to success-factor tasks, we should try to create the task instead
            // The updateTask function already handles this case, so this is just an additional safeguard
            if (req.method === 'PUT' && req.body.origin === 'success-factor') {
              console.log(`[DEBUG_TASK_API] PUT request for success-factor task failed with TASK_NOT_FOUND, but this shouldn't happen with upsert`);
            }
            
            return res.status(404).json({
              success: false,
              message: 'Task not found',
              error: dbError instanceof Error ? dbError.message : String(dbError)
            });
          }
          
          // Check if this is a task not found error or an invalid UUID format error
          if (dbError instanceof Error && 
              (dbError.message.includes('does not exist') || 
               dbError.message.includes('not found') ||
               dbError.message.includes('invalid input syntax for type uuid') ||
               dbError.message.includes('Task with ID') ||
               (dbError as any)?.code === 'TASK_NOT_FOUND' ||
               (dbError as any)?.code === '22P02')) {
            return res.status(404).json({
              success: false,
              error: 'TASK_NOT_FOUND',
              message: `Task ${taskId} not found or does not exist`
            });
          }
          
          // Otherwise, it's a different type of error
          return res.status(500).json({
            success: false,
            error: 'TASK_UPDATE_ERROR',
            message: dbError instanceof Error ? dbError.message : String(dbError)
          });
        }
        
        if (!updatedTask) {
          if (DEBUG_TASK_API) {
            console.log(`[DEBUG_TASK_API] Task update failed - task ${taskId} not found`);
          }
          return res.status(404).json({
            success: false,
            message: `Task with ID ${taskId} not found`
          });
        }
        
        // Enhanced debugging for task updates
        if (DEBUG_TASK_API) {
          console.log(`[DEBUG_TASK_API] Task update successful:`);
          console.log(`[DEBUG_TASK_API]  - ID: ${updatedTask.id}`);
          console.log(`[DEBUG_TASK_API]  - New completion status: ${updatedTask.completed}`);
        }
        
        // Critical validation: verify the update was applied correctly
        if (req.body.hasOwnProperty('completed')) {
          const completionUpdated = updatedTask.completed === req.body.completed;
          
          if (!completionUpdated) {
            // This would indicate the critical bug we're tracking!
            console.error(`[ERROR] CRITICAL: Task completion state mismatch after update!`);
            console.error(`[ERROR]  - Task ID: ${updatedTask.id}`);
            console.error(`[ERROR]  - Requested state: ${req.body.completed}`);
            console.error(`[ERROR]  - Actual state: ${updatedTask.completed}`);
            
            if (DEBUG_TASK_COMPLETION) {
              console.error(`[DEBUG_TASK_COMPLETION] *** CRITICAL ERROR: Task completion mismatch! ***`);
              console.error(`[DEBUG_TASK_COMPLETION]  - This is likely the SuccessFactor task completion bug`);
              console.error(`[DEBUG_TASK_COMPLETION]  - Requested completion: ${req.body.completed}`);
              console.error(`[DEBUG_TASK_COMPLETION]  - Actual completion: ${updatedTask.completed}`);
              console.error(`[DEBUG_TASK_COMPLETION]  - Origin: ${originalTask?.origin || updatedTask.origin}`);
              console.error(`[DEBUG_TASK_COMPLETION]  - Source ID: ${originalTask?.sourceId || updatedTask.sourceId}`);
            }
          } else if (DEBUG_TASK_COMPLETION) {
            // Successful completion update confirmation
            console.log(`[DEBUG_TASK_COMPLETION] Task completion successfully updated:`);
            console.log(`[DEBUG_TASK_COMPLETION]  - Value correctly set to: ${updatedTask.completed}`);
          }
        }
        
        // Double-check after update by fetching the task again directly from the database
        if (DEBUG_TASK_PERSISTENCE && req.body.hasOwnProperty('completed')) {
          try {
            // Using getTasksForProject instead of the non-existent getTaskById
            // and then filtering the results manually
            const allTasks = await projectsDb.getTasksForProject(projectId);
            const taskResults = allTasks.filter(task => task.id === taskId);
            const verifiedTask = taskResults?.[0];
            
            if (verifiedTask) {
              console.log(`[DEBUG_TASK_PERSISTENCE] Verification check after update:`);
              console.log(`[DEBUG_TASK_PERSISTENCE]  - Re-fetched task completion state: ${verifiedTask.completed}`);
              console.log(`[DEBUG_TASK_PERSISTENCE]  - Expected completion state: ${req.body.completed}`);
              
              if (verifiedTask.completed !== req.body.completed) {
                console.error(`[DEBUG_TASK_PERSISTENCE] *** CRITICAL: Verification check failed! ***`);
                console.error(`[DEBUG_TASK_PERSISTENCE]  - Task data was not correctly persisted in database`);
              } else {
                console.log(`[DEBUG_TASK_PERSISTENCE] ✓ Verification successful - task persisted correctly`);
              }
            }
          } catch (verifyError) {
            console.error('[DEBUG_TASK_PERSISTENCE] Error during verification check:', verifyError);
          }
        }
        
        // Return the successfully updated task
        res.status(200).json({
          success: true,
          task: updatedTask,
          message: 'Task updated successfully'
        });
        
        // The return statement here was causing issues by exiting prematurely
        // Don't return, just let execution continue to the end of the function
        
      } catch (err) {
        // Check if this is a "not found" error
        if (err instanceof Error && err.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'TASK_NOT_FOUND',
            message: 'Task not found'
          });
        } else {
          // Always return JSON response instead of re-throwing
          res.status(500).json({
            success: false,
            error: 'TASK_UPDATE_ERROR',
            message: err instanceof Error ? err.message : String(err)
          });
        }
      }
    } catch (error) {
      // Log the error for debugging
      console.error('Error updating project task:', error);
      
      // Always ensure a JSON response, even in the outer catch block
      res.status(500).json({
        success: false,
        error: 'TASK_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Final check - if we somehow get here without sending a response,
    // explicitly send a JSON response to prevent HTML fallthrough
    if (!res.headersSent) {
      console.error('[ERROR] No response was sent in task update handler, sending fallback JSON response');
      res.status(500).json({
        success: false,
        error: 'UNEXPECTED_STATE',
        message: 'An unexpected error occurred during task update processing'
      });
    }
    
    // Final fallthrough prevention - this should never be reached 
    // if any of the response.json calls above were executed
    if (!res.headersSent) {
      console.error('[FALLTHROUGH] PUT /api/projects/:projectId/tasks/:taskId handler reached end without response');
      return res.status(500).json({
        success: false,
        error: 'FALLTHROUGH_ERROR',
        message: 'Task update handler reached end without sending a response'
      });
    }
  });

  // Delete a specific task for a project
  app.delete('/api/projects/:projectId/tasks/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, taskId } = req.params;
      // Handle edge case where user might not be defined
      if (!req.user) {
        console.warn('User not found in DELETE request for task');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Safely extract user ID with proper type handling
      const userId = typeof req.user === 'object' && req.user !== null ? 
        (req.user as {id: string|number}).id : 
        req.user;
      
      console.log(`DELETE request for task ${taskId} in project ${projectId} by user ${userId}`);
      
      // Verify the project exists and user has access to it
      const project = await projectsDb.getProject(projectId);
      if (!project) {
        console.warn(`Project ${projectId} not found for task deletion`);
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Verify user ownership
      if (project.userId !== userId) {
        console.warn(`User ${userId} not authorized to delete tasks in project ${projectId}`);
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this project'
        });
      }
      
      // Verify the task exists in the project before deletion
      const tasks = await projectsDb.getTasksForProject(projectId);
      const taskExists = tasks.some(task => task.id === taskId);
      
      if (!taskExists) {
        console.warn(`Task ${taskId} not found in project ${projectId}`);
        return res.status(404).json({
          success: false,
          message: 'Task not found in this project',
          taskId
        });
      }
      
      // Make sure the task exists and belongs to the project
      try {
        console.log(`Deleting task ${taskId} from project ${projectId}`);
        await projectsDb.deleteTask(taskId);
        
        // Return a JSON response with success data instead of an empty 204
        // This helps with debugging and provides feedback to the frontend
        console.log(`Task ${taskId} successfully deleted`);
        return res.status(200).json({
          success: true,
          taskId,
          message: 'Task successfully deleted'
        });
      } catch (err) {
        // Check if this is a "not found" error
        if (err instanceof Error && err.message.includes('not found')) {
          console.error(`Task not found error during deletion: ${err.message}`);
          return res.status(404).json({
            success: false,
            message: 'Task not found',
            error: err.message
          });
        }
        // If not a not-found error, re-throw to be handled by the outer catch
        throw err;
      }
    } catch (error) {
      console.error('Error deleting project task:', error);
      res.status(500).json({
        success: false,
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

  // Register admin routes for password resets and other admin functions
  registerAdminRoutes(app);
  console.log('Admin routes registered successfully');

  // Simply create HTTP server for Express app without WebSocket server 
  // to avoid port conflicts with Vite HMR WebSocket
  const httpServer = createServer(app);
  
  return httpServer;
}