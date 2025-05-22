/**
 * Task ID Resolver Service
 * 
 * A unified service to handle task ID resolution, translation, and lookup
 * across different formats: UUID, compound ID, and sourceId
 */

import { validate as validateUUID } from 'uuid';

// Define debug flags 
const DEBUG_TASK_LOOKUP = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_MAPPING = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_PERSISTENCE = process.env.DEBUG_TASKS === 'true';

/**
 * Interface for task lookup results
 */
interface TaskLookupResult {
  task: any;
  lookupMethod: 'exact' | 'clean-uuid' | 'source-id' | 'not-found';
  originalId: string;
}

/**
 * Class to handle unified task ID resolution
 */
export class TaskIdResolver {
  /**
   * Clean a potentially compound task ID to extract just the UUID part
   * 
   * @param id The task ID which might be a compound ID
   * @returns The extracted UUID part only
   */
  static cleanTaskId(id: string): string {
    if (!id) return id;
    
    // If the ID contains a hyphen and is longer than a standard UUID,
    // it might be a compound ID with format uuid-suffix
    if (id.includes('-') && id.length > 36) {
      // Try to extract a valid UUID pattern from the beginning
      const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const match = id.match(uuidPattern);
      
      if (match && match[1]) {
        if (DEBUG_TASK_MAPPING) {
          console.log(`[TASK_RESOLVER] Extracted UUID ${match[1]} from compound ID ${id}`);
        }
        return match[1];
      }
    }
    
    // Return original ID if no UUID pattern found
    return id;
  }
  
  /**
   * Check if a string is a valid UUID
   * 
   * @param id The ID to check
   * @returns True if the ID is a valid UUID
   */
  static isValidUUID(id: string): boolean {
    if (!id) return false;
    return validateUUID(id);
  }
  
  /**
   * Create a compound ID from a UUID and a suffix
   * 
   * @param uuid The base UUID
   * @param suffix The suffix to append
   * @returns A compound ID with format uuid-suffix
   */
  static createCompoundId(uuid: string, suffix: string): string {
    if (!uuid) return uuid;
    return `${uuid}-${suffix}`;
  }
  
  /**
   * Find a task by ID using multiple resolution strategies
   * 
   * @param projectId The project ID
   * @param taskId The task ID (can be exact ID, UUID part, or related to sourceId)
   * @param projectsDb The projects database module
   * @returns Promise resolving to task or null
   */
  static async findTaskById(projectId: string, taskId: string, projectsDb: any): Promise<TaskLookupResult> {
    if (!projectId || !taskId) {
      return { 
        task: null,
        lookupMethod: 'not-found',
        originalId: taskId
      };
    }
    
    if (DEBUG_TASK_LOOKUP) {
      console.log(`[TASK_RESOLVER] Looking up task with ID: ${taskId} in project: ${projectId}`);
    }
    
    // Attempt to clean the task ID (extract UUID if compound)
    const cleanId = this.cleanTaskId(taskId);
    
    try {
      // Get all tasks for the project
      const allTasks = await projectsDb.getTasksForProject(projectId);
      
      if (!allTasks || allTasks.length === 0) {
        if (DEBUG_TASK_LOOKUP) {
          console.log(`[TASK_RESOLVER] No tasks found for project: ${projectId}`);
        }
        return {
          task: null,
          lookupMethod: 'not-found',
          originalId: taskId
        };
      }
      
      // Step 1: Try to find by exact ID match
      const exactMatch = allTasks.find(task => task.id === taskId);
      if (exactMatch) {
        if (DEBUG_TASK_LOOKUP) {
          console.log(`[TASK_RESOLVER] Found task by exact ID match: ${taskId}`);
        }
        
        return {
          task: exactMatch,
          lookupMethod: 'exact',
          originalId: taskId
        };
      }
      
      // Step 2: If cleanId is different from taskId, try to find by clean UUID
      if (cleanId !== taskId) {
        const cleanIdMatch = allTasks.find(task => task.id === cleanId);
        if (cleanIdMatch) {
          if (DEBUG_TASK_LOOKUP) {
            console.log(`[TASK_RESOLVER] Found task by clean UUID match: ${cleanId}`);
          }
          
          return {
            task: cleanIdMatch,
            lookupMethod: 'clean-uuid',
            originalId: taskId
          };
        }
      }
      
      // Step 3: For Success Factor tasks, try to find by sourceId
      if (this.isValidUUID(cleanId)) {
        const sourceIdMatch = allTasks.find(task => 
          task.sourceId === cleanId && task.origin === 'factor'
        );
        
        if (sourceIdMatch) {
          if (DEBUG_TASK_LOOKUP) {
            console.log(`[TASK_RESOLVER] Found task by sourceId match: ${cleanId}`);
            console.log(`[TASK_RESOLVER] Actual task ID: ${sourceIdMatch.id}`);
          }
          
          return {
            task: sourceIdMatch,
            lookupMethod: 'source-id',
            originalId: taskId
          };
        }
      }
      
      // Task not found through any method
      if (DEBUG_TASK_LOOKUP) {
        console.log(`[TASK_RESOLVER] Task not found with ID: ${taskId} or clean ID: ${cleanId}`);
      }
      
    } catch (err) {
      console.error('Error during task lookup:', err);
    }
    
    return {
      task: null,
      lookupMethod: 'not-found',
      originalId: taskId
    };
  }
  
  /**
   * Synchronize all related Success Factor tasks with the same sourceId
   * 
   * @param projectId The project ID
   * @param sourceId The source ID to match
   * @param updates The updates to apply to all matching tasks
   * @param projectsDb The projects database module
   * @returns Promise resolving to number of tasks updated
   */
  static async syncRelatedTasks(
    projectId: string, 
    sourceId: string, 
    updates: any,
    projectsDb: any
  ): Promise<number> {
    if (!projectId || !sourceId || !this.isValidUUID(sourceId)) {
      return 0;
    }
    
    try {
      // First get all tasks for the project
      const allTasks = await projectsDb.getTasksForProject(projectId);
      
      if (!allTasks || allTasks.length === 0) {
        return 0;
      }
      
      // Find all related Success Factor tasks with matching sourceId
      const relatedTasks = allTasks.filter(task => 
        task.sourceId === sourceId && 
        task.origin === 'factor' &&
        task.projectId === projectId
      );
      
      if (relatedTasks.length === 0) {
        return 0;
      }
      
      if (DEBUG_TASK_PERSISTENCE) {
        console.log(`[TASK_RESOLVER] Found ${relatedTasks.length} related tasks with sourceId: ${sourceId}`);
      }
      
      // Update each related task
      let updatedCount = 0;
      for (const task of relatedTasks) {
        try {
          // Use the existing updateTask method from projectsDb
          await projectsDb.updateTask(task.id, projectId, {
            ...updates,
            // Include original properties to prevent losing data
            sourceId: task.sourceId,
            origin: task.origin
          });
          updatedCount++;
        } catch (err) {
          console.error(`[TASK_RESOLVER] Error updating related task ${task.id}:`, err);
        }
      }
      
      if (DEBUG_TASK_PERSISTENCE) {
        console.log(`[TASK_RESOLVER] Successfully synchronized ${updatedCount} related tasks with sourceId: ${sourceId}`);
      }
      
      return updatedCount;
    } catch (err) {
      console.error('Error synchronizing related tasks:', err);
      return 0;
    }
  }
  
  /**
   * Create a consistent task endpoint URL
   * 
   * @param projectId The project ID
   * @param taskId The task ID
   * @returns The endpoint URL for the task
   */
  static createTaskEndpoint(projectId: string, taskId: string): string {
    const cleanId = this.cleanTaskId(taskId);
    return `/api/projects/${projectId}/tasks/${cleanId}`;
  }
}

// Create custom error class for task not found
export class TaskNotFoundError extends Error {
  code: string;
  
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
    this.code = 'TASK_NOT_FOUND';
  }
}