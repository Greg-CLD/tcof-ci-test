/**
 * TaskIdResolver Service
 * 
 * Provides robust task lookup strategies including:
 * - Exact ID matching
 * - UUID cleaning and validation
 * - Source ID resolution for Success Factor tasks
 * - Compound ID extraction and validation
 * 
 * This service is critical for handling different ID formats across the application
 * and ensuring Success Factor tasks can be properly located and updated.
 */

import { taskLogger } from './taskLogger';
import { validate as validateUuid } from 'uuid';

// Cache for task ID resolution
const taskResolutionCache: Record<string, any> = {};

// Class implementation
export class TaskIdResolver {
  private debugEnabled: boolean = false;
  
  /**
   * Constructor with required database connection
   * @param db The database connection object
   */
  constructor(private projectsDb: any) {
    if (!this.projectsDb) {
      throw new Error('[TaskIdResolver] Database connection is required');
    }
    
    // Check if debugging is enabled via environment variables
    this.debugEnabled = process.env.DEBUG_TASKS === 'true' || 
                      process.env.DEBUG_TASK_STATE === 'true' || 
                      process.env.DEBUG_TASK_COMPLETION === 'true' || 
                      process.env.DEBUG_TASK_PERSISTENCE === 'true';
    
    console.log('[TaskIdResolver] Successfully initialized with database connection');
  }
  
  /**
   * Instance method for cleaning UUIDs
   * This is needed for compatibility across different contexts
   * Delegates to the static method to reduce code duplication
   */
  cleanUUID(id: string): string {
    return TaskIdResolver.cleanUUID(id);
  }
  
  /**
   * Find a task by its ID with intelligent ID resolution
   * This is the main entry point for task lookup
   */
  async findTaskById(taskId: string, projectId: string): Promise<any> {
    // Always verify database connection is available
    if (!this.projectsDb) {
      throw new Error('TaskIdResolver missing database connection during task lookup');
    }
    
    if (!taskId || !projectId) {
      throw new Error('Task ID and Project ID are required');
    }
    
    const operationId = taskLogger.startOperation('findTaskById', taskId, projectId);
    
    try {
      // Try looking up in cache first
      const cacheKey = `${projectId}:${taskId}`;
      if (taskResolutionCache[cacheKey]) {
        const cachedTask = taskResolutionCache[cacheKey];
        
        if (this.debugEnabled) {
          console.log(`[TaskIdResolver] Found task in cache: ${taskId} -> ${cachedTask.id}`);
        }
        
        taskLogger.endOperation(operationId, true);
        return cachedTask;
      }
      
      // Strategy 1: First try exact match by ID
      if (this.debugEnabled) {
        console.log(`[TaskIdResolver] Strategy 1: Exact match lookup for ${taskId}`);
      }
      
      let task = await this.projectsDb.getTaskById(projectId, taskId);
      
      if (task) {
        if (this.debugEnabled) {
          console.log(`[TaskIdResolver] Found task with exact ID match: ${taskId}`);
        }
        
        taskLogger.logTaskLookup('exact', taskId, projectId, true, task.id);
        taskResolutionCache[cacheKey] = task;
        taskLogger.endOperation(operationId, true);
        return task;
      }
      
      // Strategy 2: Try with clean UUID
      // Use instance method for better compatibility across different contexts
      const cleanedId = this.cleanUUID(taskId);
      
      if (cleanedId && cleanedId !== taskId) {
        if (this.debugEnabled) {
          console.log(`[TaskIdResolver] Strategy 2: Clean UUID lookup for ${taskId} -> ${cleanedId}`);
        }
        
        task = await this.projectsDb.getTaskById(projectId, cleanedId);
        
        if (task) {
          if (this.debugEnabled) {
            console.log(`[TaskIdResolver] Found task with clean UUID: ${cleanedId}`);
          }
          
          taskLogger.logTaskLookup('uuid', taskId, projectId, true, task.id);
          taskResolutionCache[cacheKey] = task;
          taskLogger.endOperation(operationId, true);
          return task;
        }
      }
      
      // Strategy 3: Try compound ID extraction (TaskType-UUID format)
      if (taskId.includes('-') && !validateUuid(taskId)) {
        const parts = taskId.split('-');
        const potentialUuid = parts.slice(1).join('-'); // Combine parts after the first hyphen
        
        if (validateUuid(potentialUuid)) {
          if (this.debugEnabled) {
            console.log(`[TaskIdResolver] Strategy 3: Compound ID extraction for ${taskId} -> ${potentialUuid}`);
          }
          
          task = await this.projectsDb.getTaskById(projectId, potentialUuid);
          
          if (task) {
            if (this.debugEnabled) {
              console.log(`[TaskIdResolver] Found task with compound ID extraction: ${potentialUuid}`);
            }
            
            taskLogger.logTaskLookup('compound', taskId, projectId, true, task.id);
            taskResolutionCache[cacheKey] = task;
            taskLogger.endOperation(operationId, true);
            return task;
          }
        }
      }
      
      // Strategy 4: For Success Factor tasks, try finding by sourceId
      // This is critical for TCOF Success Factor tasks to be found consistently
      if (this.debugEnabled) {
        console.log(`[TaskIdResolver] Strategy 4: Source ID lookup for ${taskId}`);
      }
      
      // Try to find a Success Factor task with this ID as sourceId
      const tasksWithSourceId = await this.projectsDb.findTasksBySourceId(projectId, taskId);
      
      if (tasksWithSourceId && tasksWithSourceId.length > 0) {
        // Use the first task found with this sourceId
        const sourceTask = tasksWithSourceId[0];
        
        if (this.debugEnabled) {
          console.log(`[TaskIdResolver] Found task by sourceId: ${taskId} -> ${sourceTask.id}`);
          console.log(`[TaskIdResolver] Found ${tasksWithSourceId.length} tasks with sourceId ${taskId}`);
        }
        
        taskLogger.logTaskLookup('sourceId', taskId, projectId, true, sourceTask.id, sourceTask.sourceId);
        taskResolutionCache[cacheKey] = sourceTask;
        taskLogger.endOperation(operationId, true);
        return sourceTask;
      }
      
      // If we reach here, the task was not found with any strategy
      if (this.debugEnabled) {
        console.log(`[TaskIdResolver] Task not found with any strategy: ${taskId}`);
      }
      
      taskLogger.logTaskLookup('exact', taskId, projectId, false);
      taskLogger.endOperation(operationId, false);
      
      // Create a structured error with code for proper error handling
      const error = new Error(`Task not found: ${taskId}`);
      (error as any).code = 'TASK_NOT_FOUND';
      throw error;
      
    } catch (error) {
      // Re-throw TASK_NOT_FOUND errors
      if ((error as any).code === 'TASK_NOT_FOUND') {
        throw error;
      }
      
      // Log other errors
      console.error(`[TaskIdResolver] Error finding task ${taskId}:`, error);
      taskLogger.endOperation(operationId, false, error as Error);
      throw error;
    }
  }
  
  /**
   * Clear the task resolution cache
   */
  clearCache(): void {
    Object.keys(taskResolutionCache).forEach(key => {
      delete taskResolutionCache[key];
    });
    
    if (this.debugEnabled) {
      console.log(`[TaskIdResolver] Cleared task resolution cache`);
    }
  }
  
  /**
   * Helper method to clean a UUID by removing any prefix or suffix
   * Made static for use without an instance
   */
  static cleanUUID(id: string): string {
    if (!id) return id;
    
    // If it's already a valid UUID, return as is
    if (validateUuid(id)) return id;
    
    // Try to extract a UUID from a compound format (e.g., "prefix-00000000-0000-0000-0000-000000000000")
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = id.match(uuidPattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    return id;
  }
  
  // Instance method implementation already defined above
}

// Create a singleton instance with database connection
let taskIdResolverInstance: TaskIdResolver | null = null;

/**
 * Get or create the TaskIdResolver instance with database connection
 * This ensures a single properly initialized instance throughout the application
 */
export function getTaskIdResolver(db: any): TaskIdResolver {
  if (!taskIdResolverInstance) {
    if (!db) {
      throw new Error('[getTaskIdResolver] Database connection is required');
    }
    console.log('[TaskIdResolver] Creating new instance with database connection');
    taskIdResolverInstance = new TaskIdResolver(db);
  }
  return taskIdResolverInstance;
}

// Export validate function from uuid for convenience
export { validateUuid };