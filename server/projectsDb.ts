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
  // Additional fields for complete mapping
  taskType?: string;
  factorId?: string;
  sortOrder?: number;
  assignedTo?: string;
  taskNotes?: string;
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

// Block data type
export interface BlockData {
  completed: boolean;
  data: any;
  stepStatus: Record<string, boolean>;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create empty data files if they don't exist
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, '[]');
}

if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, '[]');
}

if (!fs.existsSync(POLICIES_FILE)) {
  fs.writeFileSync(POLICIES_FILE, '[]');
}

if (!fs.existsSync(PLANS_FILE)) {
  fs.writeFileSync(PLANS_FILE, '[]');
}

/**
 * Helper to convert a numeric ID to a UUID
 * This helps migrate from old numeric IDs to UUIDs
 * WARNING: This is for compatibility with existing data only
 * New projects should always use UUIDs directly
 */
export function validateProjectUUID(idString: string): string {
  // If it's already a valid UUID, return it
  if (validateUuid(idString)) {
    return idString;
  }
  
  // For backward compatibility, convert numeric IDs to UUIDs
  const projectId = parseInt(idString, 10);
  if (!isNaN(projectId)) {
    // Generate a deterministic UUID from the numeric ID
    const namespace = '1f4a0890-b8d5-5c41-aef3-11234567890a';
    return uuidv5(idString, namespace);
  }
  
  // For any other format, return a new random UUID
  return uuidv4();
}

/**
 * Helper to convert a DB task to a ProjectTask
 */
function convertDbTaskToProjectTask(dbTask: any, clientTaskId?: string): ProjectTask {
  // Normalize source field to match origin for consistent filtering
  // This helps maintain backward compatibility with older code that expects 'source'
  return {
    id: clientTaskId || dbTask.id,
    projectId: dbTask.project_id || '',
    text: dbTask.text || '',
    stage: dbTask.stage || 'identification',
    origin: dbTask.origin || 'custom',
    source: dbTask.origin || 'custom',  // Normalized duplicate of origin
    sourceId: dbTask.source_id || '',
    completed: Boolean(dbTask.completed),
    notes: dbTask.notes || '',
    priority: dbTask.priority || '',
    dueDate: dbTask.due_date || '',
    owner: dbTask.owner || '',
    status: dbTask.status || 'To Do',
    createdAt: dbTask.created_at ? new Date(dbTask.created_at).toISOString() : new Date().toISOString(),
    updatedAt: dbTask.updated_at ? new Date(dbTask.updated_at).toISOString() : new Date().toISOString(),
    // Additional fields (may be undefined if not in DB)
    taskType: dbTask.task_type,
    factorId: dbTask.factor_id,
    sortOrder: typeof dbTask.sort_order === 'number' ? dbTask.sort_order : undefined,
    assignedTo: dbTask.assigned_to,
    taskNotes: dbTask.task_notes,
  };
}

/**
 * Maps camelCase property names to snake_case database column names
 * 
 * @param data The task data with camelCase properties (from application code)
 * @returns An object with snake_case property names (for database columns)
 */
function mapCamelToSnakeCase(data: Partial<ProjectTask>): Record<string, any> {
  const updateData: Record<string, any> = {};
  
  // Direct field mappings (no conversion needed)
  if (data.text !== undefined) updateData.text = data.text;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.origin !== undefined) updateData.origin = data.origin;
  if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : data.notes;
  if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : data.priority;
  if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : data.owner;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
  
  // CamelCase to snake_case mappings
  if (data.sourceId !== undefined) updateData.source_id = validateSourceId(data.sourceId);
  if (data.projectId !== undefined) updateData.project_id = data.projectId;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate === '' ? null : data.dueDate;
  
  // Additional fields from expanded ProjectTask interface
  if (data.taskType !== undefined) updateData.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) updateData.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) updateData.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Handle dates
  if (data.createdAt !== undefined) {
    updateData.created_at = typeof data.createdAt === 'string' ? 
      new Date(data.createdAt) : data.createdAt;
  }
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}

/**
 * Project database operations
 */
/**
 * Finds a task by source_id for a specific project
 * Used as a fallback when findTaskById fails to find by primary ID
 * 
 * @param projectId The project ID to search in
 * @param sourceId The source ID to search for
 * @returns Task object if found, null otherwise
 */
export async function findTaskBySourceId(projectId: string, sourceId: string) {
  try {
    const tasks = await db.select()
      .from(projectTasksTable)
      .where(
        and(
          eq(projectTasksTable.projectId, projectId),
          eq(projectTasksTable.sourceId, sourceId)
        )
      );
    
    return tasks.length > 0 ? tasks[0] : null;
  } catch (error) {
    console.error('Error finding task by source ID:', error);
    return null;
  }
}

export const projectsDb = {
  /**
   * Create a new project
   */
  async createProject(userId, data) {
    const projectId = uuidv4();
    const now = new Date().toISOString();
    
    // Create project object
    const project: Project = {
      id: projectId,
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
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      // Save project to database
      await db.insert(projectTasksTable).values({
        id: uuidv4(),
        projectId: projectId,
        text: 'First task',
        completed: false,
        origin: 'custom'
      });
      
      // Save project to file
      const projects = loadProjects();
      projects.push(project);
      saveProjects(projects);
      
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },
  
  async getTasksForSource(projectId, sourceId) {
    try {
      // First, ensure sources exists
      return await db.select()
        .from(projectTasksTable)
        .where(
          and(
            eq(projectTasksTable.projectId, projectId),
            eq(projectTasksTable.sourceId, sourceId)
          )
        );
    } catch (error) {
      console.error('Error getting tasks for source:', error);
      return [];
    }
  },
  
  /**
   * Alias to match naming conventions
   * WARNING: This method should not be used for task lookup operations as it doesn't enforce project boundaries
   * Use findTasksBySourceIdInProject instead for operations that need proper project isolation
   */
  async getSourceTasks(sourceId, projectId = null) {
    if (DEBUG_TASKS) console.log(`Getting source tasks for sourceId=${sourceId}, projectId=${projectId}`);
    
    try {
      let query = db.select().from(projectTasksTable).where(eq(projectTasksTable.sourceId, sourceId));
      
      // If projectId is provided, filter by it
      if (projectId) {
        query = query.where(eq(projectTasksTable.projectId, projectId));
      }
      
      const tasks = await query;
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error('Error getting source tasks:', error);
      return [];
    }
  },
  
  /**
   * Find tasks by source ID for a specific project
   * This method is critical for the TaskIdResolver to find Success Factor tasks by their canonical ID
   * 
   * @param projectId The project ID to limit the search to
   * @param sourceId The source ID to search for
   * @returns Array of matching tasks
   */
  async findTasksBySourceId(projectId, sourceId) {
    try {
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.sourceId, sourceId));
      
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error(`Error finding tasks by sourceId ${sourceId}:`, error);
      return [];
    }
  },
  
  /**
   * Find tasks by source ID for a specific project with strict project boundaries
   * This method is critical for the TaskIdResolver to find Success Factor tasks by their canonical ID
   * while maintaining proper project isolation
   * 
   * @param projectId The project ID to strictly limit the search to
   * @param sourceId The source ID to search for
   * @returns Array of matching tasks only from the specified project
   */
  async findTasksBySourceIdInProject(projectId, sourceId) {
    if (DEBUG_TASKS) console.log(`[findTasksBySourceIdInProject] projectId=${projectId}, sourceId=${sourceId}`);
    
    try {
      // Find tasks with matching sourceId that also belong to the specific project
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(
          and(
            eq(projectTasksTable.projectId, projectId),
            eq(projectTasksTable.sourceId, sourceId)
          )
        );
      
      if (DEBUG_TASKS) console.log(`[findTasksBySourceIdInProject] Found ${tasks.length} tasks`);
      
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error(`Error finding tasks by sourceId ${sourceId} in project ${projectId}:`, error);
      return [];
    }
  },
  
  /**
   * Get a single task by its ID for a specific project
   * 
   * This method is required by TaskIdResolver for proper task resolution
   * It supports multiple lookup strategies for robust task resolution:
   * 1. Direct UUID lookup
   * 2. Compound/prefixed ID extraction and lookup
   * 3. Source ID lookup for Success Factor tasks
   * 
   * @param projectId The project ID the task belongs to
   * @param taskId The task ID to look up
   * @returns The task object if found, or null if not found
   */
  async getTaskById(projectId, taskId) {
    if (DEBUG_TASKS) console.log(`[getTaskById] projectId=${projectId}, taskId=${taskId}`);
    
    try {
      // Try a direct ID lookup first
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(
          and(
            eq(projectTasksTable.projectId, projectId),
            eq(projectTasksTable.id, taskId)
          )
        )
        .limit(1);
      
      if (tasks.length > 0) {
        if (DEBUG_TASKS) console.log(`[getTaskById] Found task by direct ID match`);
        return convertDbTaskToProjectTask(tasks[0]);
      }
      
      // If direct lookup fails, try sourceId lookup
      // This helps with Success Factor tasks that might be referenced by their canonical ID
      const tasksBySourceId = await db.select()
        .from(projectTasksTable)
        .where(
          and(
            eq(projectTasksTable.projectId, projectId),
            eq(projectTasksTable.sourceId, taskId)
          )
        )
        .limit(1);
      
      if (tasksBySourceId.length > 0) {
        if (DEBUG_TASKS) console.log(`[getTaskById] Found task by sourceId match`);
        return convertDbTaskToProjectTask(tasksBySourceId[0]);
      }
      
      if (DEBUG_TASKS) console.log(`[getTaskById] No task found for projectId=${projectId}, taskId=${taskId}`);
      return null;
    } catch (error) {
      console.error(`Error getting task by ID: projectId=${projectId}, taskId=${taskId}`, error);
      return null;
    }
  },
  
  /**
   * Get all tasks for a project
   */
  async getTasksForProject(projectId) {
    try {
      // Ensure directory exists
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.projectId, projectId))
        .orderBy(asc(projectTasksTable.id));
      
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error('Error getting tasks for project:', error);
      return [];
    }
  },
  
  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      if (!taskData) {
        throw new Error('Task data required');
      }
      
      console.log('Creating task with data:', taskData);
      
      // Generate a stable UUID if none provided
      const task = {
        id: taskData.id || uuidv4(),
        projectId: taskData.projectId,
        text: taskData.text || '',
        stage: taskData.stage || 'identification',
        origin: taskData.origin || 'custom',
        // Use sourceId from task data, or generate a new UUID
        sourceId: taskData.sourceId || null,
        completed: Boolean(taskData.completed),
        notes: taskData.notes || '',
        priority: taskData.priority || '',
        dueDate: taskData.dueDate || '',
        owner: taskData.owner || '',
        status: taskData.status || 'To Do',
        sortOrder: taskData.sortOrder !== undefined ? taskData.sortOrder : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Generate a default UUID for sourceId if it would be null
      // This is necessary because the sourceId column has a NOT NULL constraint
      const validatedSourceId = validateSourceId(task.sourceId);
      const finalSourceId = validatedSourceId || uuidv4(); // Use a new UUID if source id is invalid or null
      
      if (DEBUG_TASKS) console.log(`Source ID validation: original=${task.sourceId}, validated=${validatedSourceId}, final=${finalSourceId}`);
      
      // Map camelCase properties to snake_case database columns 
      const insertValues = mapCamelToSnakeCase({
        id: task.id,
        projectId: task.projectId,
        text: task.text || '',
        stage: task.stage || 'identification',
        origin: task.origin || 'custom',
        sourceId: finalSourceId,
        completed: Boolean(task.completed), 
        notes: task.notes === '' ? null : task.notes,
        priority: task.priority === '' ? null : task.priority,
        dueDate: task.dueDate === '' ? null : task.dueDate,
        owner: task.owner === '' ? null : task.owner,
        status: task.status || 'To Do',
        sortOrder: task.sortOrder !== undefined ? task.sortOrder : 0
      });
      
      // Add specific values for a new task that shouldn't use updated_at from mapping
      insertValues.id = task.id;
      insertValues.created_at = new Date();
      insertValues.updated_at = new Date();
      
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
      
      // First try to find task by sourceId
      const tasksBySourceId = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.sourceId, taskId));
      
      if (tasksBySourceId.length > 0) {
        console.log(`[TASK_LOOKUP] Found task via sourceId match`);
        return await this.updateTask(tasksBySourceId[0].id, data);
      }
      
      // Regular task lookup logic
      let validTaskId = taskId;
      let lookupMethod = 'direct';
      
      // Log the task IDs we're working with
      console.log(`[TASK_LOOKUP] Looking up task with ID: ${taskId}`);
      
      try {
        // Helper function to check if a string is UUID-like (basic format check)
        const isValidUuidFormat = (id: string): boolean => {
          // Basic pattern for a UUID or UUID-like string
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        };
        
        // STEP 1: Check if this is a sourceId for an existing task
        try {
          console.log(`[TASK_LOOKUP] Attempting sourceId lookup for ${taskId}`);
          
          // First, check for an exact sourceId match
          const tasksBySourceId = await db.select()
            .from(projectTasksTable)
            .where(eq(projectTasksTable.sourceId, taskId));
          
          if (tasksBySourceId.length > 0) {
            validTaskId = tasksBySourceId[0].id as string;
            lookupMethod = 'sourceId';
            console.log(`[TASK_LOOKUP] Found task with sourceId ${taskId}, actual id: ${validTaskId}`);
          } else {
            // For Success-Factor tasks, try a more flexible sourceId lookup
            // Check for UUID-like part of the compound ID in sourceId
            
            // Extract the UUID part if this is a compound ID (first 5 segments)
            const uuidPart = taskId.split('-').slice(0, 5).join('-');
            
            if (uuidPart !== taskId && uuidPart.length >= 36) {  // Standard UUID is 36 chars
              console.log(`[TASK_LOOKUP] Extracted UUID ${uuidPart} from compound ID ${taskId}, trying partial sourceId match`);
              
              // Try to find tasks where the sourceId contains the UUID part
              // Cast to text to ensure proper string operations
              const tasksByPartialSourceId = await db.execute(sql`
                SELECT * FROM project_tasks 
                WHERE source_id::text LIKE ${uuidPart + '%'} 
                LIMIT 1
              `);
              
              if (tasksByPartialSourceId.rows && tasksByPartialSourceId.rows.length > 0) {
                validTaskId = tasksByPartialSourceId.rows[0].id;
                lookupMethod = 'partialSourceId';
                console.log(`[TASK_LOOKUP] Found task with partial sourceId match to ${uuidPart}, actual id: ${validTaskId}`);
              } else {
                console.log(`[TASK_LOOKUP] No task found with partial sourceId match to ${uuidPart}, trying exact match`);
              }
            } else {
              console.log(`[TASK_LOOKUP] No task found with sourceId ${taskId}, trying exact match`);
            }
          }
        } catch (sourceIdError) {
          console.error(`[TASK_UPDATE_ERROR] Error during sourceId lookup for ${taskId}:`, sourceIdError);
          console.error(`[TASK_UPDATE_ERROR] Stack trace:`, sourceIdError instanceof Error ? sourceIdError.stack : 'No stack trace available');
        }
        
        // STEP 2: Check for exact id match if sourceId didn't find anything
        if (lookupMethod === 'direct') {
          try {
            console.log(`[TASK_LOOKUP] Attempting exact ID lookup for ${taskId}`);
            
            // Only attempt database query if ID is in valid UUID format
            if (isValidUuidFormat(taskId)) {
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
            } else {
              console.log(`[TASK_LOOKUP] Skipping exact ID lookup - ID ${taskId} is not in valid UUID format`);
            }
          } catch (exactIdError) {
            console.error(`[TASK_UPDATE_ERROR] Error during exact ID lookup for ${taskId}:`, exactIdError);
            console.error(`[TASK_UPDATE_ERROR] Stack trace:`, exactIdError instanceof Error ? exactIdError.stack : 'No stack trace available');
          }
        }

        // STEP 3: Prefix/pattern lookup including Success Factor tasks
        if (!validTaskId) {
          try {
            const isValidUuidPrefix = (id: string): boolean => {
              return /^[0-9a-f]{8}(-[0-9a-f]{1,4}){0,4}$/i.test(id);
            };

            const uuidPart = taskId.split('-').slice(0, 5).join('-');
            const idsToCheck = [taskId];
            if (uuidPart !== taskId && uuidPart.length >= 36) {
              idsToCheck.push(uuidPart);
              console.log(`[TASK_LOOKUP] Will also check extracted UUID part: ${uuidPart}`);
            }

            for (const idToCheck of idsToCheck) {
              if (isValidUuidPrefix(idToCheck)) {
                const factorTasksQuery = await db.execute(sql`
                  SELECT * FROM project_tasks
                  WHERE (id::text LIKE ${idToCheck + '%'} OR source_id::text LIKE ${idToCheck + '%'})
                  AND (origin = 'factor' OR origin = 'success-factor')
                  LIMIT 1
                `);

                if (factorTasksQuery.rows && factorTasksQuery.rows.length > 0) {
                  validTaskId = factorTasksQuery.rows[0].id;
                  lookupMethod = 'factorMatch';
                  console.log(`[TASK_LOOKUP] Found factor/success-factor task with ID/sourceId prefix ${idToCheck}, full ID: ${validTaskId}`);
                  break;
                }

                const matchingTasks = await db.execute(sql`
                  SELECT * FROM project_tasks
                  WHERE id::text LIKE ${idToCheck + '%'}
                  OR source_id::text LIKE ${idToCheck + '%'}
                  LIMIT 1
                `);

                if (matchingTasks.rows && matchingTasks.rows.length > 0) {
                  validTaskId = matchingTasks.rows[0].id;
                  lookupMethod = 'prefixMatch';
                  console.log(`[TASK_LOOKUP] Found task with ID/sourceId prefix ${idToCheck}, full ID: ${validTaskId}`);
                  break;
                } else {
                  console.log(`[TASK_LOOKUP] No task found with ID/sourceId prefix ${idToCheck}`);
                }
              } else {
                console.log(`[TASK_LOOKUP] Skipping prefix match - ID ${idToCheck} is not a valid UUID prefix format`);
              }
            }

            if (!validTaskId) {
              console.log(`[TASK_LOOKUP] Attempting full task list scan as final fallback`);
              const allTasks = await db.select().from(projectTasksTable);
              console.log(`[TASK_LOOKUP] Checking ${allTasks.length} tasks for UUID or compound ID match`);

              const matchingTask = allTasks.find(task => {
                for (const idToCheck of idsToCheck) {
                  if (task.id === idToCheck || (task.id && task.id.startsWith(idToCheck)) ||
                      task.sourceId === idToCheck || (task.sourceId && task.sourceId.startsWith(idToCheck))) {
                    return true;
                  }
                }
                return false;
              });

              if (matchingTask) {
                validTaskId = matchingTask.id as string;
                lookupMethod = 'fullScan';
                console.log(`[TASK_LOOKUP] Found task with full scan match, ID: ${validTaskId}`);
              } else {
                console.log(`[TASK_LOOKUP] No task found with any matching method for ${taskId}`);
              }
            }
          } catch (prefixError) {
            console.error(`[TASK_UPDATE_ERROR] Error during prefix lookup for ${taskId}:`, prefixError);
            console.error(`[TASK_UPDATE_ERROR] Stack trace:`, prefixError instanceof Error ? prefixError.stack : 'No stack trace available');
          }
        }

        if (!validTaskId) {
          if (data.origin === 'success-factor' || data.origin === 'factor') {
            console.log('[TASK_LOOKUP] Upserting missing Success-Factor task', taskId);
            const insertSql = `
              INSERT INTO project_tasks
              (id, project_id, text, stage, completed, origin, source_id)
              VALUES
              ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *
            `;
            const values = [
              taskId,
              data.projectId,
              data.text || '',
              data.stage || 'identification',
              false,
              data.origin,
              taskId
            ];
            try {
              const result = await db.execute(insertSql, values);
              if (result && Array.isArray(result.rows) && result.rows.length > 0) {
                validTaskId = result.rows[0].id;
              } else {
                validTaskId = taskId;
              }
              console.log(`[TASK_LOOKUP] Successfully upserted task: ${validTaskId}`);
            } catch (e) {
              console.error('[TASK_LOOKUP] Error upserting task:', e);
              validTaskId = taskId;
            }
            lookupMethod = 'upsert';
          } else {
            const err = new Error(`Task with ID ${taskId} does not exist`);
            // @ts-ignore - custom error property
            (err as any).code = 'TASK_NOT_FOUND';
            console.error('[TASK_UPDATE_ERROR]', err.message);
            throw err;
          }
        }

      } catch (err) {
        console.error(`[TASK_UPDATE_ERROR] Error looking up task by ID ${taskId}:`, err);
        console.error(`[TASK_UPDATE_ERROR] Stack trace:`, err instanceof Error ? err.stack : 'No stack trace available');
        throw new Error(`Failed to process task ID ${taskId}: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Fetch the existing task to preserve critical fields for factor tasks
      const existingRows = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.id, validTaskId))
        .limit(1);

      const existingTask = existingRows.length > 0 ? convertDbTaskToProjectTask(existingRows[0]) : null;

      const mergedData = { ...data };

      if (existingTask && (existingTask.origin === 'factor' || existingTask.origin === 'success-factor')) {
        if (mergedData.origin === undefined) mergedData.origin = existingTask.origin;
        if (mergedData.sourceId === undefined) mergedData.sourceId = existingTask.sourceId;
      }

      // Convert camelCase properties to snake_case for database columns
      const mappedData = mapCamelToSnakeCase(mergedData);
      
      // Check that we have data to update
      if (Object.keys(mappedData).length === 0) {
        console.error(`[TASK_UPDATE_ERROR] No valid update data provided for task ${validTaskId}`);
        throw new Error(`Cannot update task: no valid update data provided`);
      }
      
      console.log(`[TASK_UPDATE] Final update data for task ${validTaskId}:`, JSON.stringify(mappedData, null, 2));
      
      try {
        // Generate the SQL for logging purposes (before executing)
        const updateSQL = db.update(projectTasksTable)
          .set(mappedData)
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
          .set(mappedData)
          .where(eq(projectTasksTable.id, validTaskId))
          .returning();
        
        if (!updatedTask) {
          console.error(`[TASK_UPDATE_ERROR] No task updated for ID ${validTaskId}`);
          throw new Error(`Failed to update task ${validTaskId}: No rows affected`);
        }
        
        console.log(`[TASK_UPDATE] Successfully updated task ${validTaskId}`);
        
        // Verify the update actually happened
        const verifyTask = await db.select()
          .from(projectTasksTable)
          .where(eq(projectTasksTable.id, validTaskId))
          .limit(1);
        
        if (verifyTask.length === 0) {
          console.error(`[TASK_UPDATE_ERROR] Verification failed: Task ${validTaskId} not found after update`);
        } else {
          console.log(`[TASK_UPDATE] Verification success: Task ${validTaskId} found after update`);
          console.log(`[TASK_UPDATE] Task completed state: ${verifyTask[0].completed}`);
        }
        
        return convertDbTaskToProjectTask(updatedTask);
      } catch (updateError) {
        console.error(`[TASK_UPDATE_ERROR] Error updating task ${validTaskId}:`, updateError);
        console.error(`[TASK_UPDATE_ERROR] Stack trace:`, updateError instanceof Error ? updateError.stack : 'No stack available');
        throw updateError;
      }
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    try {
      await db.delete(projectTasksTable)
        .where(eq(projectTasksTable.id, taskId));
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  },
  
  /**
   * Get the user's projects
   */
  async getUserProjects(userId) {
    try {
      // Get all projects
      const projects = loadProjects();
      
      // Filter projects by user ID
      return projects.filter(p => p.userId === userId);
    } catch (error) {
      console.error('Error getting user projects:', error);
      return [];
    }
  },
  
  /**
   * Get a project by ID
   */
  async getProject(projectId) {
    try {
      // Get all projects
      const projects = loadProjects();
      
      // Find project by ID
      return projects.find(p => p.id === projectId) || null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  },
  
  /**
   * Update a project
   */
  async updateProject(projectId, data) {
    try {
      // Get all projects
      const projects = loadProjects();
      
      // Find project by ID
      const projectIndex = projects.findIndex(p => p.id === projectId);
      
      if (projectIndex === -1) {
        return null;
      }
      
      // Update project data
      projects[projectIndex] = {
        ...projects[projectIndex],
        name: data.name !== undefined ? data.name : projects[projectIndex].name,
        description: data.description !== undefined ? data.description : projects[projectIndex].description,
        sector: data.sector !== undefined ? data.sector : projects[projectIndex].sector,
        customSector: data.customSector !== undefined ? data.customSector : projects[projectIndex].customSector,
        orgType: data.orgType !== undefined ? data.orgType : projects[projectIndex].orgType,
        teamSize: data.teamSize !== undefined ? data.teamSize : projects[projectIndex].teamSize,
        currentStage: data.currentStage !== undefined ? data.currentStage : projects[projectIndex].currentStage,
        budget: data.budget !== undefined ? data.budget : projects[projectIndex].budget,
        technicalContext: data.technicalContext !== undefined ? data.technicalContext : projects[projectIndex].technicalContext,
        timelineMonths: data.timelineMonths !== undefined ? data.timelineMonths : projects[projectIndex].timelineMonths,
        nextStage: data.nextStage !== undefined ? data.nextStage : projects[projectIndex].nextStage,
        progress: data.progress !== undefined ? data.progress : projects[projectIndex].progress,
        updatedAt: new Date().toISOString(),
      };
      
      // Save projects to file
      saveProjects(projects);
      
      return projects[projectIndex];
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  },
  
  /**
   * Delete a project
   */
  async deleteProject(projectId) {
    try {
      // Get all projects
      const projects = loadProjects();
      
      // Filter out the project to delete
      const newProjects = projects.filter(p => p.id !== projectId);
      
      // Delete all tasks for this project
      await db.delete(projectTasksTable)
        .where(eq(projectTasksTable.projectId, projectId));
      
      // Save projects to file
      saveProjects(newProjects);
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  },
  
  /**
   * Get the project plan
   */
  async getPlan(projectId) {
    try {
      // Get all plans
      const plans = loadProjectPlans();
      
      // Find plan by project ID
      const plan = plans.find(p => p.projectId === projectId);
      
      if (plan) {
        return plan;
      }
      
      // Create a new empty plan if none exists
      const newPlan = {
        projectId,
        block1: { completed: false, data: {}, stepStatus: {} },
        block2: { completed: false, data: {}, stepStatus: {} },
        block3: { completed: false, data: {}, stepStatus: {} },
        checklistOutput: null,
      };
      
      // Save the new plan
      plans.push(newPlan);
      saveProjectPlans(plans);
      
      return newPlan;
    } catch (error) {
      console.error('Error getting project plan:', error);
      return null;
    }
  },
  
  /**
   * Create a project plan
   */
  async createPlan(projectId) {
    try {
      // Get all plans
      const plans = loadProjectPlans();
      
      // Check if plan already exists
      const existingPlanIndex = plans.findIndex(p => p.projectId === projectId);
      
      if (existingPlanIndex !== -1) {
        return plans[existingPlanIndex];
      }
      
      // Create a new plan
      const newPlan = {
        projectId,
        block1: { completed: false, data: {}, stepStatus: {} },
        block2: { completed: false, data: {}, stepStatus: {} },
        block3: { completed: false, data: {}, stepStatus: {} },
        checklistOutput: null,
      };
      
      // Save the new plan
      plans.push(newPlan);
      saveProjectPlans(plans);
      
      return newPlan;
    } catch (error) {
      console.error('Error creating project plan:', error);
      return null;
    }
  },
  
  /**
   * Update a project plan block
   */
  async updatePlanBlock(projectId, blockKey, blockData) {
    try {
      // Get all plans
      const plans = loadProjectPlans();
      
      // Find plan by project ID
      const planIndex = plans.findIndex(p => p.projectId === projectId);
      
      if (planIndex === -1) {
        // Create a new plan if none exists
        if (blockKey !== 'block1' && blockKey !== 'block2' && blockKey !== 'block3') {
          throw new Error(`Invalid block key: ${blockKey}`);
        }
        
        const newPlan = {
          projectId,
          block1: { completed: false, data: {}, stepStatus: {} },
          block2: { completed: false, data: {}, stepStatus: {} },
          block3: { completed: false, data: {}, stepStatus: {} },
          checklistOutput: null,
        };
        
        // Update the block data
        if (blockData.completed !== undefined) {
          newPlan[blockKey].completed = blockData.completed;
        }
        
        if (blockData.data) {
          newPlan[blockKey].data = blockData.data;
        }
        
        if (blockData.stepStatus) {
          newPlan[blockKey].stepStatus = blockData.stepStatus;
        }
        
        // Save the new plan
        plans.push(newPlan);
        saveProjectPlans(plans);
        
        return newPlan;
      }
      
      // Update the existing plan
      if (blockKey !== 'block1' && blockKey !== 'block2' && blockKey !== 'block3') {
        throw new Error(`Invalid block key: ${blockKey}`);
      }
      
      // Update the block data
      if (blockData.completed !== undefined) {
        plans[planIndex][blockKey].completed = blockData.completed;
      }
      
      if (blockData.data) {
        plans[planIndex][blockKey].data = blockData.data;
      }
      
      if (blockData.stepStatus) {
        plans[planIndex][blockKey].stepStatus = blockData.stepStatus;
      }
      
      // Save the updated plans
      saveProjectPlans(plans);
      
      return plans[planIndex];
    } catch (error) {
      console.error('Error updating project plan block:', error);
      return null;
    }
  },
  
  /**
   * Get a project plan block
   */
  async getPlanBlock(projectId, blockKey) {
    try {
      const plan = await this.getPlan(projectId);
      
      if (!plan) {
        return null;
      }
      
      if (blockKey !== 'block1' && blockKey !== 'block2' && blockKey !== 'block3') {
        throw new Error(`Invalid block key: ${blockKey}`);
      }
      
      return plan[blockKey];
    } catch (error) {
      console.error('Error getting project plan block:', error);
      return null;
    }
  },
  
  /**
   * Delete a project plan
   */
  async deletePlan(projectId) {
    try {
      // Get all plans
      const plans = loadProjectPlans();
      
      // Filter out the plan to delete
      const newPlans = plans.filter(p => p.projectId !== projectId);
      
      // Save plans to file
      saveProjectPlans(newPlans);
      
      return true;
    } catch (error) {
      console.error('Error deleting project plan:', error);
      return false;
    }
  },
  
  /**
   * Get all project plans
   */
  async getPlans() {
    try {
      return loadProjectPlans();
    } catch (error) {
      console.error('Error getting project plans:', error);
      return [];
    }
  },
};

/**
 * Load projects from the data file
 */
function loadProjects(): Project[] {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
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
    const data = fs.readFileSync(POLICIES_FILE, 'utf-8');
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
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving project policies:', error);
    return false;
  }
}

/**
 * Load project plans from the data file
 */
function loadProjectPlans(): ProjectPlan[] {
  try {
    const data = fs.readFileSync(PLANS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading project plans:', error);
    return [];
  }
}

/**
 * Save project plans to the data file
 */
function saveProjectPlans(plans: ProjectPlan[]): boolean {
  try {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving project plans:', error);
    return false;
  }
}

// Export the database module
export default projectsDb;