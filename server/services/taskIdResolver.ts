/**
 * Task ID Resolver Service
 * 
 * A unified service to handle task ID resolution, translation, and lookup
 * across different formats: UUID, compound ID, and sourceId
 */

import { pool } from '../db';
import { validate as validateUUID } from 'uuid';
import { DEBUG_TASK_LOOKUP, DEBUG_TASK_MAPPING, DEBUG_TASK_PERSISTENCE } from '../../shared/constants.debug';

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
   * @returns Promise resolving to task or null
   */
  static async findTaskById(projectId: string, taskId: string): Promise<TaskLookupResult> {
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
    
    // Step 1: Try to find by exact ID match
    try {
      const exactMatchQuery = `
        SELECT * FROM project_tasks 
        WHERE id = $1 AND project_id = $2
      `;
      
      const exactMatchResult = await pool.query(exactMatchQuery, [taskId, projectId]);
      
      if (exactMatchResult.rows.length > 0) {
        if (DEBUG_TASK_LOOKUP) {
          console.log(`[TASK_RESOLVER] Found task by exact ID match: ${taskId}`);
        }
        
        return {
          task: exactMatchResult.rows[0],
          lookupMethod: 'exact',
          originalId: taskId
        };
      }
    } catch (err) {
      console.error('Error during exact match task lookup:', err);
    }
    
    // Step 2: If cleanId is different from taskId, try to find by clean UUID
    if (cleanId !== taskId) {
      try {
        const cleanIdQuery = `
          SELECT * FROM project_tasks 
          WHERE id = $1 AND project_id = $2
        `;
        
        const cleanIdResult = await pool.query(cleanIdQuery, [cleanId, projectId]);
        
        if (cleanIdResult.rows.length > 0) {
          if (DEBUG_TASK_LOOKUP) {
            console.log(`[TASK_RESOLVER] Found task by clean UUID match: ${cleanId}`);
          }
          
          return {
            task: cleanIdResult.rows[0],
            lookupMethod: 'clean-uuid',
            originalId: taskId
          };
        }
      } catch (err) {
        console.error('Error during clean UUID task lookup:', err);
      }
    }
    
    // Step 3: For Success Factor tasks, try to find by sourceId
    if (this.isValidUUID(cleanId)) {
      try {
        const sourceIdQuery = `
          SELECT * FROM project_tasks 
          WHERE source_id = $1 AND project_id = $2 AND origin = 'factor'
        `;
        
        const sourceIdResult = await pool.query(sourceIdQuery, [cleanId, projectId]);
        
        if (sourceIdResult.rows.length > 0) {
          if (DEBUG_TASK_LOOKUP) {
            console.log(`[TASK_RESOLVER] Found task by sourceId match: ${cleanId}`);
          }
          
          return {
            task: sourceIdResult.rows[0],
            lookupMethod: 'source-id',
            originalId: taskId
          };
        }
      } catch (err) {
        console.error('Error during sourceId task lookup:', err);
      }
    }
    
    // Task not found through any method
    if (DEBUG_TASK_LOOKUP) {
      console.log(`[TASK_RESOLVER] Task not found with ID: ${taskId} or clean ID: ${cleanId}`);
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
   * @returns Promise resolving to number of tasks updated
   */
  static async syncRelatedTasks(projectId: string, sourceId: string, updates: any): Promise<number> {
    if (!projectId || !sourceId || !this.isValidUUID(sourceId)) {
      return 0;
    }
    
    try {
      // Only sync tasks that have the same sourceId in the same project
      const updateQuery = `
        UPDATE project_tasks
        SET 
          completed = $1,
          updated_at = NOW()
        WHERE 
          project_id = $2 AND 
          source_id = $3 AND
          origin = 'factor'
        RETURNING id
      `;
      
      const result = await pool.query(updateQuery, [
        updates.completed,
        projectId,
        sourceId
      ]);
      
      if (DEBUG_TASK_PERSISTENCE) {
        console.log(`[TASK_RESOLVER] Synchronized ${result.rows.length} related tasks with sourceId: ${sourceId}`);
      }
      
      return result.rows.length;
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