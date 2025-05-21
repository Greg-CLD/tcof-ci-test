/**
 * Projects database module
 * Provides centralized project storage and persistence
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4, v5 as uuidv5, validate as validateUuid } from 'uuid';
import { db } from './db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { projectTasks as projectTasksTable } from '@shared/schema';
import { DEBUG_TASKS, DEBUG_FILES } from '@shared/constants.debug';

/**
 * Validates sourceId to ensure it's either a valid UUID or null
 * Non-UUID strings will be converted to null to prevent database errors
 * 
 * @param sourceId The source ID to validate
 * @returns Either a valid UUID string or null
 */
function validateSourceId(sourceId: string | null | undefined): string | null {
  // If sourceId is empty/null/undefined, return null
  if (!sourceId) return null;
  
  // Check if it's already a valid UUID
  if (validateUuid(sourceId)) {
    return sourceId;
  }
  
  // Log warning about invalid sourceId - always show warnings, even in production
  console.warn(`Invalid UUID format for sourceId: "${sourceId}". Converting to null to prevent database errors.`);
  
  // Return null for invalid UUIDs to avoid database constraint errors
  return null;
}

// Path to projects data file
const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const TASKS_FILE = path.join(DATA_DIR, 'project_tasks.json');
const POLICIES_FILE = path.join(DATA_DIR, 'project_policies.json');
const PLANS_FILE = path.join(DATA_DIR, 'project_plans.json');

// Project data type
export interface Project {
  id: string;
  userId: number;
  name: string;
  description?: string;
  sector?: string;
  customSector?: string;
  orgType?: string;
  teamSize?: string;
  currentStage?: string;
  budget?: string;
  technicalContext?: string;
  timelineMonths?: string;
  nextStage?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

// Project task data type
export interface ProjectTask {
  id: string;
  projectId: string;
  text: string;
  stage: string;
  /** Original source classification of the task */
  origin: string;
  /** Normalized duplicate of origin for consistent filtering */
  source: string;
  sourceId: string;
  completed: boolean;
  notes: string;
  priority: string;
  dueDate: string;
  owner: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Project policy data type
export interface ProjectPolicy {
  projectId: string;
  type: string;
  enabled: boolean;
  config: any;
}

// Project plan data type
export interface ProjectPlan {
  projectId: string;
  block1: BlockData;
  block2: BlockData;
  block3: BlockData;
  checklistOutput: any;
}

// Block data type for plan storage
export interface BlockData {
  completed: boolean;
  data: any;
  stepStatus: Record<string, boolean>;
}

/**
 * Helper to convert a numeric ID to a UUID
 * This helps migrate from old numeric IDs to UUIDs
 * WARNING: This is for compatibility with existing data only
 * New projects should always use UUIDs directly
 */
export function validateProjectUUID(idString: string): string {
  // If it's already a UUID, return it directly
  if (idString.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return idString;
  }
  
  // Otherwise it's likely an old numeric ID format
  // Throw an error as we no longer support non-UUID formats
  throw new Error(`Invalid project ID format: ${idString}`);
}

/**
 * Helper to convert a DB task to a ProjectTask
 */
function convertDbTaskToProjectTask(dbTask: any, clientTaskId?: string): ProjectTask {
  // Convert dates to strings for consistent interface
  let createdAt = dbTask.createdAt;
  if (createdAt instanceof Date) {
    try {
      createdAt = createdAt.toISOString();
    } catch (e) {
      console.error('Error parsing createdAt date:', e);
    }
  }
  
  let updatedAt = dbTask.updatedAt;
  if (updatedAt instanceof Date) {
    try {
      updatedAt = updatedAt.toISOString();
    } catch (e) {
      console.error('Error parsing updatedAt date:', e);
    }
  }
  
  // Check if this is a compound factor ID situation
  // If sourceId has the pattern of a compound UUID-suffix ID and looks like it came from a factor
  // use it as the client-facing ID for consistency
  let effectiveId = dbTask.id;
  
  if (clientTaskId) {
    // If we're explicitly given the client ID to use, use it
    effectiveId = clientTaskId;
  } else if (dbTask.sourceId && 
             dbTask.sourceId.includes('-') && 
             dbTask.sourceId.split('-').length > 5 && 
             dbTask.origin === 'factor') {
    // This is likely a task created from a factor with a compound ID
    // Use the sourceId as the client-facing ID for consistency
    effectiveId = dbTask.sourceId;
    if (DEBUG_TASKS) console.log(`Using sourceId ${dbTask.sourceId} as client-facing ID for task ${dbTask.id}`);
  }
  
  // Determine the origin value - use original or default to 'custom'
  const origin = dbTask.origin || 'custom';
  
  // CRITICAL FIX: Always set source field equal to origin for consistent handling
  // This ensures both fields are always present for proper filtering and display
  return {
    id: effectiveId,
    projectId: dbTask.projectId,
    text: dbTask.text || '',
    stage: dbTask.stage || '',
    origin: origin,
    source: origin, // Always set source equal to origin for consistent filtering
    sourceId: dbTask.sourceId || '',
    completed: !!dbTask.completed,
    notes: dbTask.notes || '',
    priority: dbTask.priority || '',
    dueDate: dbTask.dueDate || '',
    owner: dbTask.owner || '',
    status: dbTask.status || 'To Do',
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString()
  };
}

/**
 * Project database operations
 */
export const projectsDb = {
  /**
   * Create a new project
   */
  createProject(userId, data) {
    try {
      const now = new Date().toISOString();
      const project = {
        id: uuidv4(),
        userId,
        name: data.name || 'New Project',
        description: data.description || '',
        sector: data.sector || '',
        customSector: data.customSector || '',
        orgType: data.orgType || '',
        teamSize: data.teamSize || '',
        currentStage: data.currentStage || '',
        budget: data.budget || '',
        technicalContext: data.technicalContext || '',
        timelineMonths: data.timelineMonths || '',
        nextStage: data.nextStage || '',
        progress: data.progress || 0,
        createdAt: now,
        updatedAt: now
      };
      
      const projects = loadProjects();
      projects.push(project);
      saveProjects(projects);
      
      // Also create an empty plan structure for this project
      const plans = loadProjectPlans();
      const emptyPlan = {
        projectId: project.id,
        block1: { completed: false, data: {}, stepStatus: {} },
        block2: { completed: false, data: {}, stepStatus: {} },
        block3: { completed: false, data: {}, stepStatus: {} },
        checklistOutput: null
      };
      plans.push(emptyPlan);
      saveProjectPlans(plans);
      
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },
  
  // Get tasks for source
  async getTasksForSource(projectId, sourceId) {
    try {
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(and(
          eq(projectTasksTable.projectId, projectId),
          eq(projectTasksTable.sourceId, sourceId)
        ))
        .orderBy(asc(projectTasksTable.createdAt));
      
      // Use the enhanced convertDbTaskToProjectTask function for consistent ID handling
      return tasks.map(task => {
        // For factor-origin tasks with compound IDs, maintain client-side consistency
        if (task.origin === 'factor' && task.sourceId && task.sourceId.includes('-') && task.sourceId.split('-').length > 5) {
          return convertDbTaskToProjectTask(task, task.sourceId);
        }
        // If the sourceId matches the requested sourceId and it looks like a compound ID
        // use it for consistency with the client request
        if (task.sourceId === sourceId && sourceId.includes('-') && sourceId.split('-').length > 5) {
          return convertDbTaskToProjectTask(task, sourceId);
        }
        return convertDbTaskToProjectTask(task);
      });
    } catch (error) {
      console.error(`Error getting tasks for source ${sourceId}:`, error);
      return [];
    }
  },
  
  // Alias to match naming conventions
  async getSourceTasks(sourceId) {
    try {
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.sourceId, sourceId))
        .orderBy(asc(projectTasksTable.createdAt));
      
      // Use the enhanced convertDbTaskToProjectTask function for consistent ID handling
      return tasks.map(task => {
        // For factor-origin tasks with compound IDs, maintain client-side consistency
        if (task.origin === 'factor' && task.sourceId && task.sourceId.includes('-') && task.sourceId.split('-').length > 5) {
          return convertDbTaskToProjectTask(task, task.sourceId);
        }
        // If the sourceId matches the requested sourceId and it looks like a compound ID
        // use it for consistency with the client request
        if (task.sourceId === sourceId && sourceId.includes('-') && sourceId.split('-').length > 5) {
          return convertDbTaskToProjectTask(task, sourceId);
        }
        return convertDbTaskToProjectTask(task);
      });
    } catch (error) {
      console.error(`Error getting tasks for source ${sourceId}:`, error);
      return [];
    }
  },
  
  // Get all tasks for a project
  async getTasksForProject(projectId) {
    try {
      if (DEBUG_TASKS) console.log(`Getting tasks for project ${projectId}`);
      
      // Generate SQL for logging
      const querySQL = db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.projectId, projectId))
        .orderBy(asc(projectTasksTable.createdAt))
        .toSQL();
      
      if (DEBUG_TASKS) console.log('SQL query to be executed:', querySQL.sql);
      if (DEBUG_TASKS) console.log('SQL parameters:', JSON.stringify(querySQL.params, null, 2));
      
      // Execute the query
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.projectId, projectId))
        .orderBy(asc(projectTasksTable.createdAt));
      
      if (DEBUG_TASKS) console.log(`Retrieved ${tasks.length} tasks for project ${projectId}`);
      
      if (tasks.length > 0) {
        if (DEBUG_TASKS) console.log('First task sample:', JSON.stringify(tasks[0], null, 2));
      } else {
        if (DEBUG_TASKS) console.log('No tasks found for this project.');
        
        // Additional diagnostic query for this project
        if (DEBUG_TASKS) console.log('Running diagnostics for project tasks...');
        
        // Check if any tasks exist in the system at all
        const allTasksCount = await db.select({ count: sql`count(*)` })
          .from(projectTasksTable);
        if (DEBUG_TASKS) console.log(`Total tasks in database: ${allTasksCount[0]?.count || 0}`);
        
        // Check for tasks with similar projectId (partial match)
        try {
          const similarProjectTasks = await db.execute(sql`
            SELECT id, project_id, text 
            FROM project_tasks 
            WHERE project_id::text LIKE ${projectId.substring(0, 8) + '%'}
            LIMIT 5
          `);
          
          if (similarProjectTasks.rows?.length > 0) {
            if (DEBUG_TASKS) console.log(`Found ${similarProjectTasks.rows.length} tasks with similar project ID prefixes:`);
            if (DEBUG_TASKS) console.log(JSON.stringify(similarProjectTasks.rows, null, 2));
          }
        } catch (diagError) {
          console.error('Diagnostic query error:', diagError);
        }
      }
      
      // Convert and return tasks
      // Process each task to handle possible compound IDs and maintain client-side consistency
      return tasks.map(task => {
        // For factor-origin tasks with compound IDs in sourceId, use consistent ID handling
        if (task.origin === 'factor' && task.sourceId && task.sourceId.includes('-') && task.sourceId.split('-').length > 5) {
          return convertDbTaskToProjectTask(task, task.sourceId);
        }
        return convertDbTaskToProjectTask(task);
      });
    } catch (error) {
      console.error(`Error getting tasks for project ${projectId}:`, error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : '');
      return [];
    }
  },
  
  // Create a task for a project
  async createTask(taskData) {
    if (!taskData.projectId) {
      if (DEBUG_TASKS) console.error('Cannot create task: missing projectId');
      return null;
    }
    
    if (DEBUG_TASKS) console.log('Validating task data:', {
      projectId: taskData.projectId,
      text: taskData.text,
      stage: taskData.stage,
      hasId: !!taskData.id
    });

    try {
      const normalizedProjectId = validateProjectUUID(taskData.projectId);
      if (DEBUG_TASKS) console.log(`Creating task for normalized project ID: ${normalizedProjectId}`);
      
      // Check if we have a compound ID from a factor task
      let taskId = taskData.id || uuidv4();
      let sourceId = taskData.sourceId || '';
      
      // Check if the sourceId is a valid UUID, and set to null if not
      if (sourceId && !validateUuid(sourceId)) {
        if (DEBUG_TASKS) console.warn(`Invalid UUID format for sourceId: "${sourceId}". Will be set to null.`);
        sourceId = null;
      }
      
      // If task ID is a compound ID (likely from a factor), store as sourceId
      if (taskData.id && taskData.id.includes('-') && taskData.id.split('-').length > 5) {
        if (DEBUG_TASKS) console.log(`Detected compound ID for task: ${taskData.id}`);
        
        // In this case, use the compound ID as sourceId for tracking, but generate a proper UUID
        sourceId = taskData.id;
        taskId = uuidv4();
        
        if (DEBUG_TASKS) console.log(`Using compound ID as sourceId: ${sourceId}`);
        if (DEBUG_TASKS) console.log(`Generated new valid UUID for task: ${taskId}`);
        
        // Check if task already exists with this sourceId
        try {
          const existingTasks = await db.select()
            .from(projectTasksTable)
            .where(eq(projectTasksTable.sourceId, sourceId))
            .limit(1);
            
          if (existingTasks.length > 0) {
            if (DEBUG_TASKS) console.log(`Task with sourceId ${sourceId} already exists, using its data for update`);
            
            // Return the existing task (client can use update endpoint if needed)
            return convertDbTaskToProjectTask(existingTasks[0]);
          }
        } catch (lookupErr) {
          if (DEBUG_TASKS) console.warn(`Error checking for existing tasks with sourceId ${sourceId}:`, lookupErr);
          // Continue with task creation regardless
        }
      }
      
      // Convert empty values to appropriate defaults
      const task = {
        id: taskId,
        projectId: normalizedProjectId,
        text: taskData.text || '',
        stage: taskData.stage || 'identification',
        origin: taskData.origin || 'custom',
        sourceId: sourceId,
        completed: taskData.completed || false,
        notes: taskData.notes || '',
        priority: taskData.priority || '',
        dueDate: taskData.dueDate || '',
        owner: taskData.owner || '',
        status: taskData.status || 'To Do',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (DEBUG_TASKS) console.log('Task object prepared for insert:', JSON.stringify(task, null, 2));
      
      // Save the task to the database using Drizzle insert
      if (DEBUG_TASKS) console.log('Starting database insert operation');
      
      // Properly sanitize values for database insertion:
      // 1. Convert empty strings to null for any nullable fields
      // 2. Ensure dates are handled correctly
      // Generate a default UUID for sourceId if it would be null
      // This is necessary because the sourceId column has a NOT NULL constraint
      const validatedSourceId = validateSourceId(task.sourceId);
      const finalSourceId = validatedSourceId || uuidv4(); // Use a new UUID if source id is invalid or null
      
      if (DEBUG_TASKS) console.log(`Source ID validation: original=${task.sourceId}, validated=${validatedSourceId}, final=${finalSourceId}`);
      
      const insertValues = {
        id: task.id,
        projectId: task.projectId,
        text: task.text || '',
        stage: task.stage || 'identification',
        origin: task.origin || 'custom',
        sourceId: finalSourceId,
        completed: Boolean(task.completed), 
        // Handle possible empty strings by converting them to null
        notes: task.notes === '' ? null : task.notes,
        priority: task.priority === '' ? null : task.priority,
        dueDate: task.dueDate === '' ? null : task.dueDate,
        owner: task.owner === '' ? null : task.owner,
        status: task.status || 'To Do',
        createdAt: new Date(),  // Always use current date
        updatedAt: new Date()   // Always use current date
      };
      console.log('Insert values:', JSON.stringify(insertValues, null, 2));
      
      // Generate the SQL for logging (before executing)
      const insertSQL = db.insert(projectTasksTable)
        .values(insertValues)
        .toSQL();
      
      console.log('SQL to be executed:', insertSQL.sql);
      console.log('SQL parameters:', JSON.stringify(insertSQL.params, null, 2));
      
      try {
        // Execute the actual insert
        const [savedTask] = await db.insert(projectTasksTable)
          .values(insertValues)
          .returning();
        
        console.log('Database operation result:', savedTask ? 'Success' : 'Failed (null)');
        console.log('Rows affected:', savedTask ? '1' : '0');
        
        if (savedTask) {
          console.log('Saved task from DB:', JSON.stringify(savedTask, null, 2));
          
          // Verify the task exists immediately after creation with a direct query
          const verifyResult = await db.select()
            .from(projectTasksTable)
            .where(eq(projectTasksTable.id, savedTask.id));
          
          if (DEBUG_TASKS) console.log('Verification query result:', JSON.stringify(verifyResult, null, 2));
          if (DEBUG_TASKS) console.log('Task verified in database:', verifyResult.length > 0 ? 'Yes' : 'No');
          
          // Pass the original task ID (from client request) to maintain client-side consistency
          return convertDbTaskToProjectTask(savedTask, taskData.id);
        }
        
        // Always log critical database errors, even when debug is disabled
        console.error('Task creation failed: Database returned null after insert');
        return null;
      } catch (insertError) {
        // Always log critical database errors, even when debug is disabled
        console.error('Database insert exception:', insertError);
        console.error('Error details:', insertError instanceof Error ? insertError.message : 'Unknown error');
        console.error('Error stack:', insertError instanceof Error ? insertError.stack : '');
        throw insertError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error.stack : '';
      
      // Always log critical database errors, even when debug is disabled
      console.error('Error creating task:', {
        message: errorMessage,
        stack: errorDetails,
        taskData: {
          id: taskData.id,
          projectId: taskData.projectId,
          text: taskData.text,
          stage: taskData.stage
        }
      });
      return null;
    }
  },
  
  // Update an existing task
  async updateTask(taskId: string, data: Partial<ProjectTask>) {
    try {
      console.log(`Updating task ${taskId} with data:`, data);
      
      // Check for factor-task compound IDs (like "f219d47b-39b5-5be1-86f2-e0ec3afc8e3b-c1332bc7")
      // These are likely concatenations of a UUID with a suffix
      let validTaskId = null;
      let lookupMethod = 'none';
      
      // Log the task IDs we're working with
      console.log(`[TASK_LOOKUP] Looking up task with ID: ${taskId}`);
      
      try {
        // STEP 1: Check if this is a sourceId for an existing task
        try {
          console.log(`[TASK_LOOKUP] Attempting sourceId lookup for ${taskId}`);
          const tasksBySourceId = await db.select()
            .from(projectTasksTable)
            .where(eq(projectTasksTable.sourceId, taskId));
          
          if (tasksBySourceId.length > 0) {
            validTaskId = tasksBySourceId[0].id as string;
            lookupMethod = 'sourceId';
            console.log(`[TASK_LOOKUP] Found task with sourceId ${taskId}, actual id: ${validTaskId}`);
          } else {
            console.log(`[TASK_LOOKUP] No task found with sourceId ${taskId}, trying exact match`);
          }
        } catch (sourceIdError) {
          console.error(`[TASK_UPDATE_ERROR] Error during sourceId lookup for ${taskId}:`, sourceIdError);
          console.error(`[TASK_UPDATE_ERROR] Stack trace:`, sourceIdError instanceof Error ? sourceIdError.stack : 'No stack trace available');
        }
        
        // STEP 2: Check for exact id match if sourceId didn't find anything
        if (!validTaskId) {
          try {
            console.log(`[TASK_LOOKUP] Attempting exact ID lookup for ${taskId}`);
            const tasksByExactId = await db.select()
              .from(projectTasksTable)
              .where(eq(projectTasksTable.id, taskId))
              .limit(1);
              
            if (tasksByExactId.length > 0) {
              validTaskId = taskId;
              lookupMethod = 'exactId';
              console.log(`[TASK_LOOKUP] Found task with exact ID ${taskId}`);
            } else {
              console.log(`[TASK_LOOKUP] No task found with exact ID ${taskId}, trying prefix match`);
            }
          } catch (exactIdError) {
            console.error(`[TASK_UPDATE_ERROR] Error during exact ID lookup for ${taskId}:`, exactIdError);
            console.error(`[TASK_UPDATE_ERROR] Stack trace:`, exactIdError instanceof Error ? exactIdError.stack : 'No stack trace available');
          }
        }
        
        // STEP 3: Try prefix matching as a last resort
        if (!validTaskId) {
          try {
            console.log(`[TASK_LOOKUP] Attempting prefix match for ${taskId}`);
            const allTasks = await db.select()
              .from(projectTasksTable);
              
            console.log(`[TASK_LOOKUP] Checking ${allTasks.length} tasks for UUID prefix match with: ${taskId}`);
            
            // Find a task whose ID starts with our clean UUID
            const matchingTask = allTasks.find(task => {
              return task.id === taskId || task.id.startsWith(taskId);
            });
            
            if (matchingTask) {
              validTaskId = matchingTask.id as string;
              lookupMethod = 'prefixMatch';
              console.log(`[TASK_LOOKUP] Found task with ID prefix ${taskId}, full ID: ${validTaskId}`);
            } else {
              console.log(`[TASK_LOOKUP] No task found with ID prefix ${taskId}`);
              console.log('[TASK_LOOKUP] Available task IDs:', allTasks.map(t => t.id).join(', '));
            }
          } catch (prefixError) {
            console.error(`[TASK_UPDATE_ERROR] Error during prefix lookup for ${taskId}:`, prefixError);
            console.error(`[TASK_UPDATE_ERROR] Stack trace:`, prefixError instanceof Error ? prefixError.stack : 'No stack trace available');
          }
        }
        
        // STEP 4: If no matching task was found by any method, throw an error with status code
        if (!validTaskId) {
          const msg = `Task with ID ${taskId} does not exist. Searched by sourceId, exact match, and UUID prefix match. Task may need to be created first.`;
          console.error(`[TASK_UPDATE_ERROR] ${msg}`);
          // Return a custom error that can be mapped to a 404 response in the API layer
          const notFoundError = new Error(msg);
          notFoundError.code = 'TASK_NOT_FOUND';
          throw notFoundError;
        }
        
      } catch (err) {
        console.error(`[TASK_UPDATE_ERROR] Error looking up task by ID ${taskId}:`, err);
        console.error(`[TASK_UPDATE_ERROR] Stack trace:`, err instanceof Error ? err.stack : 'No stack trace available');
        throw new Error(`Failed to process task ID ${taskId}: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      try {
        // Sanitize input data to ensure types match and handle empty strings properly
        const updateData: Record<string, string | boolean | null | Date> = {};
        
        // Only update fields that are provided, with proper empty string handling
        if (data.text !== undefined) updateData.text = String(data.text);
        if (data.stage !== undefined) updateData.stage = String(data.stage);
        if (data.origin !== undefined) updateData.origin = String(data.origin);
        if (data.sourceId !== undefined) updateData.sourceId = String(data.sourceId);
        if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
        
        // For nullable fields, convert empty strings to null
        if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : String(data.notes);
        if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : String(data.priority);
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate === '' ? null : String(data.dueDate);
        if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : String(data.owner);
        if (data.status !== undefined) updateData.status = String(data.status);
        
        // Always update the updatedAt timestamp
        updateData.updatedAt = new Date();
        
        console.log(`Prepared update data for task ${validTaskId}:`, JSON.stringify(updateData, null, 2));
        
        try {
          // Generate the SQL for logging purposes (before executing)
          const updateSQL = db.update(projectTasksTable)
            .set(updateData)
            .where(eq(projectTasksTable.id, validTaskId))
            .toSQL();
          
          console.log('SQL to be executed:', updateSQL.sql);
          console.log('SQL parameters:', JSON.stringify(updateSQL.params, null, 2));
        } catch (sqlGenerationError) {
          // Log but continue - this is just for diagnostic purposes
          console.error(`[TASK_UPDATE_ERROR] Error generating SQL for task ${validTaskId}:`, sqlGenerationError);
        }
        
        try {
          // Update the task using Drizzle with the actual matched DB ID (validTaskId), not the incoming taskId
          const [updatedTask] = await db.update(projectTasksTable)
            .set(updateData)
            .where(eq(projectTasksTable.id, validTaskId))
            .returning();
          
          console.log('[TASK_UPDATE] Database operation result:', updatedTask ? 'Success' : 'Failed (null)');
          console.log('[TASK_UPDATE] Rows affected:', updatedTask ? '1' : '0');
          
          if (updatedTask) {
            console.log(`[TASK_UPDATE] Task ${validTaskId} updated successfully:`, JSON.stringify(updatedTask, null, 2));
            
            try {
              // Verify the task exists and was updated with a direct query
              const verifyResult = await db.select()
                .from(projectTasksTable)
                .where(eq(projectTasksTable.id, validTaskId));
              
              console.log('[TASK_UPDATE] Verification query result:', JSON.stringify(verifyResult, null, 2));
              console.log('[TASK_UPDATE] Task verified in database:', verifyResult.length > 0 ? 'Yes' : 'No');
            } catch (verifyError) {
              // Log but continue - verification failure shouldn't stop the operation
              console.error(`[TASK_UPDATE_ERROR] Error verifying task update for ${validTaskId}:`, verifyError);
              console.error(`[TASK_UPDATE_ERROR] Stack trace:`, verifyError instanceof Error ? verifyError.stack : 'No stack trace available');
            }
            
            // Pass the original taskId to maintain client-side consistency
            try {
              const converted = convertDbTaskToProjectTask(updatedTask, taskId);
              
              // Add requested [TASK_LOOKUP] debug output with request/matched ID details
              console.log('[TASK_LOOKUP]', {
                rawId: taskId,
                matchedId: updatedTask.id,
                matchedVia: lookupMethod
              });
              
              console.log('[TASK_UPDATE] Converted task:', JSON.stringify(converted, null, 2));
              return converted;
            } catch (conversionError) {
              console.error(`[TASK_UPDATE_ERROR] Error converting task ${validTaskId} after update:`, conversionError);
              console.error(`[TASK_UPDATE_ERROR] Stack trace:`, conversionError instanceof Error ? conversionError.stack : 'No stack trace available');
              console.error(`[TASK_UPDATE_ERROR] Raw task data:`, JSON.stringify(updatedTask, null, 2));
              throw new Error(`Task was updated but could not be converted to the client format: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
            }
          } else {
            console.error(`[TASK_UPDATE_ERROR] Database update returned null for task ${validTaskId}. No rows affected.`);
            throw new Error(`Task with ID ${validTaskId} not found or couldn't be updated. Database operation affected 0 rows.`);
          }
        } catch (updateDbError) {
          console.error(`[TASK_UPDATE_ERROR] Database error updating task ${validTaskId}:`, updateDbError);
          console.error(`[TASK_UPDATE_ERROR] Stack trace:`, updateDbError instanceof Error ? updateDbError.stack : 'No stack trace available');
          console.error(`[TASK_UPDATE_ERROR] Task was found via ${lookupMethod} matching but update operation failed.`);
          throw new Error(`Database error updating task ${validTaskId}: ${updateDbError instanceof Error ? updateDbError.message : String(updateDbError)}`);
        }
      } catch (dataError) {
        console.error(`[TASK_UPDATE_ERROR] Error processing update data for task ${validTaskId}:`, dataError);
        console.error(`[TASK_UPDATE_ERROR] Stack trace:`, dataError instanceof Error ? dataError.stack : 'No stack trace available');
        console.error(`[TASK_UPDATE_ERROR] Task found via ${lookupMethod} matching but data preparation failed.`);
        throw new Error(`Failed to prepare update data for task ${validTaskId}: ${dataError instanceof Error ? dataError.message : String(dataError)}`);
      }
    } catch (error) {
      // Capture and log the complete error context
      console.error(`[TASK_UPDATE_ERROR] Failed to update task ${taskId}:`, error);
      console.error(`[TASK_UPDATE_ERROR] Error type:`, error?.constructor?.name || typeof error);
      console.error(`[TASK_UPDATE_ERROR] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available'); 
      console.error(`[TASK_UPDATE_ERROR] Input data:`, JSON.stringify(data, null, 2));
      
      // Map custom TASK_NOT_FOUND error to 404 HTTP error
      if (error && error.code === 'TASK_NOT_FOUND') {
        throw Object.assign(error, { status: 404 });
      }
      
      // Re-throw with enhanced information for API error handling
      if (error instanceof Error) {
        error.message = `Task update failed: ${error.message}`;
      }
      throw error;
    }
  },
  
  // Delete a task
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      if (DEBUG_TASKS) console.log(`Attempting to delete task ${taskId}`);
      console.log(`[TASK_LOOKUP] Looking up task for deletion with ID: ${taskId}`);
      
      // Resolve the task ID to a valid database ID
      let validTaskId = taskId;
      let taskFound = false;
      
      // First verify the task exists before trying to delete it
      try {
        // First check if this is a factor ID, not a task ID
        if (taskId && taskId.length === 36 && taskId.includes('-')) {
          // Check if there are any tasks that have this ID as sourceId (likely a success factor ID)
          const tasksBySourceId = await db.select()
            .from(projectTasksTable)
            .where(eq(projectTasksTable.sourceId, taskId));
            
          if (tasksBySourceId.length > 0) {
            // This is likely a success factor ID being mistakenly passed as a task ID
            console.log(`[TASK_LOOKUP] The ID ${taskId} appears to be a success factor ID, not a task ID`);
            throw new Error(`Cannot delete ID ${taskId} directly: this appears to be a success factor ID, not a task ID. Try deleting a specific task instead.`);
          }
        }
        
        // CASE 1: Check if task exists with the exact ID
        const existingTasks = await db.select()
          .from(projectTasksTable)
          .where(eq(projectTasksTable.id, taskId));
        
        if (existingTasks.length > 0) {
          // Found a direct match
          taskFound = true;
          console.log(`[TASK_LOOKUP] Found task with exact ID match: ${taskId}`);
          if (DEBUG_TASKS) console.log(`Found task to delete:`, existingTasks[0]);
        } else {
          console.log(`[TASK_LOOKUP] No exact match found for task ID: ${taskId}`);
          
          // CASE 2: Check if this is a clean UUID being used to delete a task with a compound ID
          // Get all tasks and check if any have an ID that starts with the incoming ID
          const allTasks = await db.select()
            .from(projectTasksTable);
          
          console.log(`[TASK_LOOKUP] Checking ${allTasks.length} tasks for UUID prefix match with: ${taskId}`);
          
          // Find a task whose ID starts with our clean UUID (the taskId is a prefix of a compound ID)
          const matchingTask = allTasks.find(task => {
            // Extract the clean UUID from the task's ID (first 5 segments)
            const taskCleanId = (task.id as string).split('-').slice(0, 5).join('-');
            
            // Log the comparison for debugging
            console.log(`[TASK_LOOKUP] Comparing clean UUID ${taskId} with task ${task.id} (clean: ${taskCleanId})`);
            
            // Return true if the task ID matches exactly OR if the task ID starts with the input ID
            return task.id === taskId || task.id.startsWith(taskId);
          });
          
          if (matchingTask) {
            // Here's the key change: use the matched task's ACTUAL ID for database operations
            validTaskId = matchingTask.id as string;
            taskFound = true;
            console.log(`[TASK_LOOKUP] Found task with matching clean UUID prefix, using full ID: ${validTaskId}`);
            if (DEBUG_TASKS) console.log(`Found task to delete:`, matchingTask);
          } else {
            console.log(`[TASK_LOOKUP] Task with ID ${taskId} not found by any method`);
            // Log all available task IDs for debugging
            console.log('[TASK_LOOKUP] Available task IDs:', allTasks.map(t => t.id).join(', '));
            throw new Error(`Task with ID ${taskId} not found. Searched by exact match and UUID prefix match.`);
          }
        }
      } catch (verifyErr) {
        if (DEBUG_TASKS) console.error(`Error verifying task ${taskId} existence:`, verifyErr);
        throw verifyErr; // Don't proceed with deletion if task not found
      }
      
      // Perform the deletion with returning to verify success
      const result = await db.delete(projectTasksTable)
        .where(eq(projectTasksTable.id, validTaskId))
        .returning({ id: projectTasksTable.id });
      
      if (DEBUG_TASKS) console.log(`Deletion result for task ${taskId}:`, result);
      
      if (result && result.length > 0) {
        // Add requested [TASK_LOOKUP] debug output with request/matched ID details
        console.log('[TASK_LOOKUP]', {
          rawId: taskId,
          matchedId: validTaskId,
          matchedVia: (validTaskId === taskId) ? 'exact' : 'prefix'
        });
        
        if (DEBUG_TASKS) console.log(`Successfully deleted task ${taskId}`);
        return true;
      }
      
      // If no rows were affected, the task doesn't exist
      if (DEBUG_TASKS) console.warn(`No rows affected when deleting task ${taskId}`);
      throw new Error(`Task with ID ${taskId} not found or couldn't be deleted`);
    } catch (error) {
      if (DEBUG_TASKS) console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  },
  
  // Get all projects
  getProjects() {
    try {
      return loadProjects();
    } catch (error) {
      console.error('Error getting all projects:', error);
      return [];
    }
  },
  
  // Get projects for a specific user
  getUserProjects(userId) {
    try {
      const projects = loadProjects().filter(project => project.userId === userId);
      return projects;
    } catch (error) {
      console.error(`Error getting projects for user ${userId}:`, error);
      return [];
    }
  },
  
  // Get a specific project by ID
  getProject(projectId) {
    try {
      const projects = loadProjects();
      const project = projects.find(p => p.id === projectId);
      return project || null;
    } catch (error) {
      console.error(`Error getting project ${projectId}:`, error);
      return null;
    }
  },
  
  // Update a project
  updateProject(projectId, data) {
    try {
      const projects = loadProjects();
      const index = projects.findIndex(p => p.id === projectId);
      
      if (index !== -1) {
        // Update only the fields that are provided
        const project = projects[index];
        const updatedProject = {
          ...project,
          name: data.name !== undefined ? data.name : project.name,
          description: data.description !== undefined ? data.description : project.description,
          sector: data.sector !== undefined ? data.sector : project.sector,
          customSector: data.customSector !== undefined ? data.customSector : project.customSector,
          orgType: data.orgType !== undefined ? data.orgType : project.orgType,
          teamSize: data.teamSize !== undefined ? data.teamSize : project.teamSize,
          currentStage: data.currentStage !== undefined ? data.currentStage : project.currentStage,
          budget: data.budget !== undefined ? data.budget : project.budget,
          technicalContext: data.technicalContext !== undefined ? data.technicalContext : project.technicalContext,
          timelineMonths: data.timelineMonths !== undefined ? data.timelineMonths : project.timelineMonths,
          nextStage: data.nextStage !== undefined ? data.nextStage : project.nextStage,
          progress: data.progress !== undefined ? data.progress : project.progress,
          updatedAt: new Date().toISOString()
        };
        
        projects[index] = updatedProject;
        saveProjects(projects);
        
        return updatedProject;
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error);
      return null;
    }
  },
  
  // Delete a project
  deleteProject(projectId) {
    try {
      const projects = loadProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      
      if (filteredProjects.length !== projects.length) {
        saveProjects(filteredProjects);
        
        // Also remove project plans
        const plans = loadProjectPlans();
        const filteredPlans = plans.filter(p => p.projectId !== projectId);
        saveProjectPlans(filteredPlans);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error deleting project ${projectId}:`, error);
      return false;
    }
  },
  
  // Get a plan for a project
  getPlan(projectId) {
    try {
      const plans = loadProjectPlans();
      const plan = plans.find(p => p.projectId === projectId);
      
      if (plan) {
        return plan;
      }
      
      // Create a new plan if one doesn't exist
      return this.createPlan(projectId);
    } catch (error) {
      console.error(`Error getting plan for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Create a plan for a project
  createPlan(projectId) {
    try {
      const plans = loadProjectPlans();
      
      // Check if plan already exists
      const existingPlan = plans.find(p => p.projectId === projectId);
      if (existingPlan) {
        return existingPlan;
      }
      
      // Create a new plan
      const newPlan = {
        projectId,
        block1: { completed: false, data: {}, stepStatus: {} },
        block2: { completed: false, data: {}, stepStatus: {} },
        block3: { completed: false, data: {}, stepStatus: {} },
        checklistOutput: null
      };
      
      plans.push(newPlan);
      saveProjectPlans(plans);
      
      return newPlan;
    } catch (error) {
      console.error(`Error creating plan for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Update a specific block in a plan
  updatePlanBlock(projectId, blockKey, blockData) {
    try {
      const plans = loadProjectPlans();
      const index = plans.findIndex(p => p.projectId === projectId);
      
      if (index !== -1) {
        const plan = plans[index];
        
        // Update only the specified block
        if (blockKey === 'block1' || blockKey === 'block2' || blockKey === 'block3' || blockKey === 'checklistOutput') {
          plans[index] = {
            ...plan,
            [blockKey]: blockKey === 'checklistOutput' 
              ? blockData // For checklistOutput, just set the full value
              : {
                  ...plan[blockKey],
                  ...blockData,
                  // If stepStatus is provided, merge it with existing status
                  stepStatus: blockData.stepStatus 
                    ? { ...plan[blockKey].stepStatus, ...blockData.stepStatus }
                    : plan[blockKey].stepStatus
                }
          };
          
          saveProjectPlans(plans);
          return plans[index];
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating plan block for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Get a specific block from a plan
  getPlanBlock(projectId, blockKey) {
    try {
      const plan = this.getPlan(projectId);
      
      if (plan && (blockKey === 'block1' || blockKey === 'block2' || blockKey === 'block3' || blockKey === 'checklistOutput')) {
        return plan[blockKey];
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting plan block for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Delete a plan
  deletePlan(projectId) {
    try {
      const plans = loadProjectPlans();
      const filteredPlans = plans.filter(p => p.projectId !== projectId);
      
      if (filteredPlans.length !== plans.length) {
        saveProjectPlans(filteredPlans);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error deleting plan for project ${projectId}:`, error);
      return false;
    }
  },
  
  // Get all plans
  getPlans() {
    try {
      return loadProjectPlans();
    } catch (error) {
      console.error('Error getting all plans:', error);
      return [];
    }
  }
};

/**
 * Load projects from the data file
 */
function loadProjects(): Project[] {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

/**
 * Save projects to the data file
 */
function saveProjects(projects: Project[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving projects:', error);
    return false;
  }
}

/**
 * Load project policies from the data file
 */
function loadProjectPolicies(): ProjectPolicy[] {
  try {
    if (!fs.existsSync(POLICIES_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      fs.writeFileSync(POLICIES_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(POLICIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading project policies:', error);
    return [];
  }
}

/**
 * Save project policies to the data file
 */
function saveProjectPolicies(policies: ProjectPolicy[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2));
    return true;
  } catch (error) {
    if (DEBUG_FILES) console.error('Error saving project policies:', error);
    return false;
  }
}

/**
 * Load project plans from the data file
 */
function loadProjectPlans(): ProjectPlan[] {
  try {
    if (!fs.existsSync(PLANS_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      fs.writeFileSync(PLANS_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(PLANS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (DEBUG_FILES) console.error('Error loading project plans:', error);
    return [];
  }
}

/**
 * Save project plans to the data file
 */
function saveProjectPlans(plans: ProjectPlan[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
    return true;
  } catch (error) {
    if (DEBUG_FILES) console.error('Error saving project plans:', error);
    return false;
  }
}

export default projectsDb;
