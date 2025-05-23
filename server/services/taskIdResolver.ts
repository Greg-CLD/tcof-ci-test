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
    
    // Log the request details for debugging
    if (this.debugEnabled) {
      console.log(`[TASK_LOOKUP] Looking up task with ID: ${taskId}`);
      console.log(`[TASK_LOOKUP] Project ID: ${projectId}`);
      console.log(`[TASK_LOOKUP] Operation ID: ${operationId}`);
    }
    
    try {
      // Get all tasks for the project to help with diagnostics if needed
      let allProjectTasks: any[] = [];
      try {
        allProjectTasks = await this.projectsDb.getTasksForProject(projectId);
        if (this.debugEnabled) {
          console.log(`[TASK_LOOKUP] Project has ${allProjectTasks.length} total tasks`);
        }
      } catch (e) {
        console.warn(`[TASK_LOOKUP] Unable to get all tasks for project ${projectId}:`, e);
      }
      
      // Try looking up in cache first
      const cacheKey = `${projectId}:${taskId}`;
      if (taskResolutionCache[cacheKey]) {
        const cachedTask = taskResolutionCache[cacheKey];
        
        if (this.debugEnabled) {
          console.log(`[TASK_LOOKUP] Found task in cache: ${taskId} → ${cachedTask.id}`);
          console.log(`[TASK_LOOKUP] Cache hit details:`, {
            id: cachedTask.id, 
            origin: cachedTask.origin || 'standard',
            sourceId: cachedTask.sourceId || 'N/A'
          });
        }
        
        taskLogger.endOperation(operationId, true);
        return cachedTask;
      }
      
      // Strategy 1: First try exact match by ID
      if (this.debugEnabled) {
        console.log(`[TASK_LOOKUP] Strategy 1: Exact match lookup for ${taskId}`);
      }
      
      let task = await this.projectsDb.getTaskById(projectId, taskId);
      
      if (task) {
        if (this.debugEnabled) {
          console.log(`[TASK_LOOKUP] Found task with exact ID match: ${taskId}`);
          console.log(`[TASK_LOOKUP] Task details:`, {
            id: task.id, 
            origin: task.origin || 'standard', 
            sourceId: task.sourceId || 'N/A',
            text: task.text
          });
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
          console.log(`[TASK_LOOKUP] Strategy 2: Clean UUID lookup for ${taskId} → ${cleanedId}`);
        }
        
        task = await this.projectsDb.getTaskById(projectId, cleanedId);
        
        if (task) {
          if (this.debugEnabled) {
            console.log(`[TASK_LOOKUP] Found task with clean UUID: ${cleanedId}`);
            console.log(`[TASK_LOOKUP] Task details:`, {
              id: task.id, 
              origin: task.origin || 'standard', 
              sourceId: task.sourceId || 'N/A',
              text: task.text
            });
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
            console.log(`[TASK_LOOKUP] Strategy 3: Compound ID extraction for ${taskId} → ${potentialUuid}`);
          }
          
          task = await this.projectsDb.getTaskById(projectId, potentialUuid);
          
          if (task) {
            if (this.debugEnabled) {
              console.log(`[TASK_LOOKUP] Found task with compound ID extraction: ${potentialUuid}`);
              console.log(`[TASK_LOOKUP] Task details:`, {
                id: task.id, 
                origin: task.origin || 'standard', 
                sourceId: task.sourceId || 'N/A',
                text: task.text
              });
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
        console.log(`[TASK_LOOKUP] Strategy 4: Source ID lookup for ${taskId}`);
      }
      
      // Check if we have a candidate success factor task in all tasks
      const potentialSourceIdMatches = allProjectTasks.filter(
        t => t.sourceId === taskId || 
             (t.sourceId && t.sourceId.includes(taskId)) || 
             (taskId.includes(t.sourceId))
      );
      
      if (potentialSourceIdMatches.length > 0 && this.debugEnabled) {
        console.log(`[TASK_LOOKUP] Found ${potentialSourceIdMatches.length} potential sourceId matches before DB query`);
        potentialSourceIdMatches.forEach(t => {
          console.log(`[TASK_LOOKUP] Potential match: id=${t.id}, sourceId=${t.sourceId}, origin=${t.origin || 'standard'}`);
        });
      }
      
      // CRITICAL FIX: Use the project boundary-enforced method to find tasks by sourceId
      // This ensures we only find tasks in the requested project
      const tasksWithSourceId = await this.projectsDb.findTasksBySourceIdInProject(projectId, taskId);
      
      if (tasksWithSourceId && tasksWithSourceId.length > 0) {
        // Use the first task found with this sourceId
        const sourceTask = tasksWithSourceId[0];
        
        // CRITICAL FIX: Double-check project ID to ensure task belongs to the correct project
        if (sourceTask.projectId !== projectId) {
          if (this.debugEnabled) {
            console.log(`[TASK_LOOKUP] Project mismatch! Task ${sourceTask.id} belongs to project ${sourceTask.projectId}, not ${projectId}`);
          }
          // Task is from wrong project, do not use it
          // Continue to the next strategy
        } else {
          if (this.debugEnabled) {
            console.log(`[TASK_LOOKUP] Found task by sourceId: ${taskId} → ${sourceTask.id}`);
            console.log(`[TASK_LOOKUP] Found ${tasksWithSourceId.length} tasks with sourceId ${taskId}`);
            console.log(`[TASK_LOOKUP] Using first match with details:`, {
              id: sourceTask.id, 
              origin: sourceTask.origin || 'standard', 
              sourceId: sourceTask.sourceId || 'N/A',
              text: sourceTask.text,
              projectId: sourceTask.projectId
            });
          }
          
          taskLogger.logTaskLookup('sourceId', taskId, projectId, true, sourceTask.id, sourceTask.sourceId);
          taskResolutionCache[cacheKey] = sourceTask;
          taskLogger.endOperation(operationId, true);
          return sourceTask;
        }
      }
      
      // Strategy 5: Fallback - Look for tasks with partial ID matches
      if (this.debugEnabled) {
        console.log(`[TASK_LOOKUP] Strategy 5: Fallback - Looking for partial ID matches`);
      }
      
      // First, identify potential matches
      const partialMatches = allProjectTasks.filter(t => {
        // Check for partial ID matches
        const idMatch = t.id && (t.id.includes(taskId) || taskId.includes(t.id));
        
        // Check for partial sourceId matches
        const sourceIdMatch = t.sourceId && (t.sourceId.includes(taskId) || taskId.includes(t.sourceId));
        
        return idMatch || sourceIdMatch;
      });
      
      if (partialMatches.length > 0) {
        if (this.debugEnabled) {
          console.log(`[TASK_LOOKUP] Found ${partialMatches.length} tasks with partial ID matches`);
          partialMatches.forEach(t => {
            console.log(`[TASK_LOOKUP] Partial match: id=${t.id}, sourceId=${t.sourceId || 'N/A'}, origin=${t.origin || 'standard'}`);
          });
        }
        
        // Prioritize Success Factor tasks
        const factorMatch = partialMatches.find(t => t.origin === 'factor' || t.origin === 'success-factor');
        if (factorMatch) {
          if (this.debugEnabled) {
            console.log(`[TASK_LOOKUP] Using Success Factor task from partial matches: ${factorMatch.id}`);
            console.log(`[TASK_LOOKUP] Success Factor task details:`, {
              id: factorMatch.id, 
              origin: factorMatch.origin, 
              sourceId: factorMatch.sourceId || 'N/A',
              text: factorMatch.text
            });
          }
          
          // Use 'fallback' as the strategy type to match taskLogger's allowed types
          taskLogger.logTaskLookup('fallback', taskId, projectId, true, factorMatch.id, factorMatch.sourceId);
          taskResolutionCache[cacheKey] = factorMatch;
          taskLogger.endOperation(operationId, true);
          return factorMatch;
        }
        
        // If no Success Factor tasks, use the first match
        if (this.debugEnabled) {
          console.log(`[TASK_LOOKUP] Using first task from partial matches: ${partialMatches[0].id}`);
          console.log(`[TASK_LOOKUP] Task details:`, {
            id: partialMatches[0].id, 
            origin: partialMatches[0].origin || 'standard', 
            sourceId: partialMatches[0].sourceId || 'N/A',
            text: partialMatches[0].text
          });
        }
        
        // Use 'fallback' as the strategy type to match taskLogger's allowed types
        taskLogger.logTaskLookup('fallback', taskId, projectId, true, partialMatches[0].id);
        taskResolutionCache[cacheKey] = partialMatches[0];
        taskLogger.endOperation(operationId, true);
        return partialMatches[0];
      }
      
      // If we reach here, the task was not found with any strategy
      if (this.debugEnabled) {
        console.log(`[TASK_LOOKUP] Task not found with any strategy: ${taskId}`);
        
        // Log all available tasks for diagnostic purposes
        console.log(`[TASK_LOOKUP] All available tasks in project ${projectId}:`);
        if (allProjectTasks.length === 0) {
          console.log(`[TASK_LOOKUP] No tasks found in project ${projectId}`);
        } else {
          console.log(`[TASK_LOOKUP] Found ${allProjectTasks.length} tasks in project ${projectId}:`);
          allProjectTasks.forEach(t => {
            console.log(`[TASK_LOOKUP] Task: id=${t.id}, origin=${t.origin || 'standard'}, sourceId=${t.sourceId || 'N/A'}, text=${t.text || 'No text'}`);
          });
        }
      }
      
      taskLogger.logTaskLookup('exact', taskId, projectId, false);
      taskLogger.endOperation(operationId, false);
      
      // Create a structured error with code for proper error handling
      const error = new Error(`Task not found: ${taskId} in project ${projectId}`);
      (error as any).code = 'TASK_NOT_FOUND';
      throw error;
      
    } catch (error) {
      // Re-throw TASK_NOT_FOUND errors
      if ((error as any).code === 'TASK_NOT_FOUND') {
        throw error;
      }
      
      // Log other errors
      console.error(`[TASK_LOOKUP] Error finding task ${taskId}:`, error);
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