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
            const verifiedTask = await projectsDb.getTaskById(result.id);
            if (verifiedTask) {
              console.log(`[DEBUG_TASK_COMPLETION] Verification lookup successful:`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Verified completion state: ${!!verifiedTask.completed}`);
              
              if (verifiedTask.completed !== result.completed) {
                console.error(`[DEBUG_TASK_COMPLETION] *** CRITICAL: Verification mismatch! ***`);
              }
            }
          } catch (verifyError) {
            console.error(`[DEBUG_TASK_COMPLETION] Error during verification lookup:`, verifyError);
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
      
      const tasks = await projectsDb.getTasksForProject(projectId);
      
      // Enhanced debugging for task retrieval
      if (DEBUG_TASK_API) {
        console.log(`[DEBUG_TASK_API] Retrieved ${tasks?.length || 0} tasks for project ${projectId}`);
        
        // Special debug logging for SuccessFactor tasks
        const successFactorTasks = (tasks || []).filter(task => task.origin === 'success-factor');
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

  // Update a specific task for a project
  app.put('/api/projects/:projectId/tasks/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, taskId } = req.params;
      const taskUpdate = req.body;
      
      // Add diagnostic logging for the task update operation
      const DEBUG_TASK_API = process.env.DEBUG_TASKS === 'true';
      
      if (DEBUG_TASK_API) {
        console.log(`[DEBUG_TASK_API] PUT request to update task ${taskId} for project ${projectId}`);
        console.log(`[DEBUG_TASK_API] Task update payload:`, JSON.stringify(taskUpdate));
        
        // Special diagnostic for completion status updates
        if (taskUpdate.hasOwnProperty('completed')) {
          console.log(`[DEBUG_TASK_API] *** Completion status update detected ***`);
          console.log(`[DEBUG_TASK_API] New completion value: ${taskUpdate.completed}`);
        }
      }

      // Ensure we have the required fields
      if (!taskUpdate) {
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
          originalTask = await projectsDb.getTaskById(taskId);
          
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
              console.log(`[DEBUG_TASK_COMPLETION]  - Requested completion state: ${taskUpdate.completed}`);
              console.log(`[DEBUG_TASK_COMPLETION]  - Source ID: ${originalTask.sourceId}`);
              
              // Log the entire task update object for comprehensive debugging
              if (DEBUG_TASK_PERSISTENCE) {
                console.log(`[DEBUG_TASK_PERSISTENCE] Full task update object:`, taskUpdate);
              }
            }
            
            // Track state transitions with the new debug flag
            if (DEBUG_TASK_STATE && taskUpdate.hasOwnProperty('completed')) {
              console.log(`[DEBUG_TASK_STATE] Task state transition tracked:`);
              console.log(`[DEBUG_TASK_STATE]  - Task ID: ${originalTask.id}`);
              console.log(`[DEBUG_TASK_STATE]  - Title: ${originalTask.text?.substring(0, 40)}...`);
              console.log(`[DEBUG_TASK_STATE]  - Origin: ${originalTask.origin}`);
              console.log(`[DEBUG_TASK_STATE]  - From state: ${originalTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
              console.log(`[DEBUG_TASK_STATE]  - To state: ${taskUpdate.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
              
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
          console.log(`[DEBUG_TASK_PERSISTENCE]  - Update fields:`, Object.keys(taskUpdate));
          
          if (taskUpdate.hasOwnProperty('completed')) {
            console.log(`[DEBUG_TASK_PERSISTENCE]  - Completion value being set: ${taskUpdate.completed}`);
          }
        }
        
        // Attempt to update the task with error tracking
        let updatedTask;
        try {
          updatedTask = await projectsDb.updateTask(taskId, taskUpdate);
        } catch (dbError) {
          // Log database errors immediately
          console.error('[ERROR] Database error during task update:', dbError);
          
          if (DEBUG_TASK_PERSISTENCE) {
            console.error(`[DEBUG_TASK_PERSISTENCE] Task update database operation failed:`);
            console.error(`[DEBUG_TASK_PERSISTENCE]  - Task ID: ${taskId}`);
            console.error(`[DEBUG_TASK_PERSISTENCE]  - Error: ${dbError.message}`);
          }
          
          throw dbError; // Re-throw to be caught by outer try/catch
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
        if (taskUpdate.hasOwnProperty('completed')) {
          const completionUpdated = updatedTask.completed === taskUpdate.completed;
          
          if (!completionUpdated) {
            // This would indicate the critical bug we're tracking!
            console.error(`[ERROR] CRITICAL: Task completion state mismatch after update!`);
            console.error(`[ERROR]  - Task ID: ${updatedTask.id}`);
            console.error(`[ERROR]  - Requested state: ${taskUpdate.completed}`);
            console.error(`[ERROR]  - Actual state: ${updatedTask.completed}`);
            
            if (DEBUG_TASK_COMPLETION) {
              console.error(`[DEBUG_TASK_COMPLETION] *** CRITICAL ERROR: Task completion mismatch! ***`);
              console.error(`[DEBUG_TASK_COMPLETION]  - This is likely the SuccessFactor task completion bug`);
              console.error(`[DEBUG_TASK_COMPLETION]  - Requested completion: ${taskUpdate.completed}`);
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
        if (DEBUG_TASK_PERSISTENCE && taskUpdate.hasOwnProperty('completed')) {
          try {
            const verifiedTask = await projectsDb.getTaskById(taskId);
            
            if (verifiedTask) {
              console.log(`[DEBUG_TASK_PERSISTENCE] Verification check after update:`);
              console.log(`[DEBUG_TASK_PERSISTENCE]  - Re-fetched task completion state: ${verifiedTask.completed}`);
              console.log(`[DEBUG_TASK_PERSISTENCE]  - Expected completion state: ${taskUpdate.completed}`);
              
              if (verifiedTask.completed !== taskUpdate.completed) {
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
        return res.status(200).json({
          success: true,
          task: updatedTask,
          message: 'Task updated successfully'
        });
      } catch (err) {
        // Check if this is a "not found" error
        if (err instanceof Error && err.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: 'Task not found',
            error: err.message
          });
        }
        // Re-throw any other errors to be caught by the outer catch
        throw err; 
      }
    } catch (error) {
      console.error('Error updating project task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project task',
        error: error instanceof Error ? error.message : 'Unknown error'
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
      
      const userId = req.user.id || req.user;
      
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

  // Simply create HTTP server for Express app without WebSocket server 
  // to avoid port conflicts with Vite HMR WebSocket
  const httpServer = createServer(app);
  
  return httpServer;
}