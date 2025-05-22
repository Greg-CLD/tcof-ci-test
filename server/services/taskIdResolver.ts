/**
 * TaskIdResolver Service
 * 
 * A unified service for resolving task IDs across different formats:
 * - Exact UUID match
 * - Compound ID extraction (clean UUID from compound format)
 * - Source ID lookup (for Success Factor tasks)
 * 
 * This service ensures consistent task lookup regardless of ID format
 * and provides specialized error handling for missing tasks.
 */

import { db } from '../../db';
import { eq, and, ne } from 'drizzle-orm';
import { projectTasks } from '../../shared/schema';

// Debug flag for detailed logging
const DEBUG_RESOLVER = process.env.DEBUG_TASKS === 'true';

// Regular expression to extract a UUID from a compound ID
const UUID_REGEX = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

// Specialized error classes for task resolution failures
export class TaskNotFoundError extends Error {
  code: string;
  status: number;
  
  constructor(taskId: string, projectId: string) {
    super(`Task with ID ${taskId} not found in project ${projectId}`);
    this.name = 'TaskNotFoundError';
    this.code = 'TASK_NOT_FOUND';
    this.status = 404;
  }
}

export class TaskAccessDeniedError extends Error {
  code: string;
  status: number;
  
  constructor(taskId: string, projectId: string) {
    super(`Access denied to task ${taskId} in project ${projectId}`);
    this.name = 'TaskAccessDeniedError';
    this.code = 'TASK_ACCESS_DENIED';
    this.status = 403;
  }
}

export class TaskIdResolver {
  /**
   * Clean a potentially compound UUID to extract just the UUID portion
   * 
   * @param rawId The raw ID that may contain a UUID
   * @returns The extracted UUID or the original ID if no UUID is found
   */
  static cleanUUID(rawId: string): string {
    if (!rawId) return rawId;
    
    // Try to extract a UUID using regex
    const match = rawId.match(UUID_REGEX);
    if (match && match[1]) {
      if (DEBUG_RESOLVER) {
        console.log(`[TASK_ID_RESOLVER] Extracted UUID ${match[1]} from ${rawId}`);
      }
      return match[1];
    }
    
    // Return the original ID if no UUID is found
    return rawId;
  }
  
  /**
   * Find a task by its ID, with support for multiple lookup strategies
   * 
   * @param taskId The task ID to look up
   * @param projectId The project ID the task belongs to
   * @returns The task object if found
   * @throws TaskNotFoundError if the task cannot be found
   */
  static async findTaskById(taskId: string, projectId: string) {
    if (!taskId || !projectId) {
      throw new Error('Task ID and Project ID are required');
    }
    
    if (DEBUG_RESOLVER) {
      console.log(`[TASK_ID_RESOLVER] Looking up task ${taskId} in project ${projectId}`);
    }
    
    // Strategy 1: Try exact ID match
    try {
      const task = await db.query.projectTasks.findFirst({
        where: and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId)
        )
      });
      
      if (task) {
        if (DEBUG_RESOLVER) {
          console.log(`[TASK_ID_RESOLVER] Found task by exact ID match: ${taskId}`);
        }
        return task;
      }
    } catch (error) {
      console.error(`[TASK_ID_RESOLVER] Error looking up task by exact ID: ${error}`);
    }
    
    // Strategy 2: Try clean UUID extraction
    try {
      const cleanId = TaskIdResolver.cleanUUID(taskId);
      
      // Skip if cleanId is the same as taskId (no change)
      if (cleanId !== taskId) {
        const task = await db.query.projectTasks.findFirst({
          where: and(
            eq(projectTasks.id, cleanId),
            eq(projectTasks.projectId, projectId)
          )
        });
        
        if (task) {
          if (DEBUG_RESOLVER) {
            console.log(`[TASK_ID_RESOLVER] Found task by clean UUID: ${cleanId}`);
          }
          return task;
        }
      }
    } catch (error) {
      console.error(`[TASK_ID_RESOLVER] Error looking up task by clean UUID: ${error}`);
    }
    
    // Strategy 3: Check if it's a Success Factor ID
    try {
      // For Success Factor tasks, check if taskId matches source_id
      const task = await db.query.projectTasks.findFirst({
        where: and(
          eq(projectTasks.sourceId, taskId),
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.origin, 'factor')
        )
      });
      
      if (task) {
        if (DEBUG_RESOLVER) {
          console.log(`[TASK_ID_RESOLVER] Found task by Success Factor source_id: ${taskId}`);
        }
        return task;
      }
    } catch (error) {
      console.error(`[TASK_ID_RESOLVER] Error looking up task by source_id: ${error}`);
    }
    
    // Task not found after all strategies
    if (DEBUG_RESOLVER) {
      console.log(`[TASK_ID_RESOLVER] Task not found with ID ${taskId} in project ${projectId}`);
    }
    
    throw new TaskNotFoundError(taskId, projectId);
  }
  
  /**
   * Update a task by its ID
   * 
   * @param taskId The task ID to update
   * @param projectId The project ID the task belongs to
   * @param updates The updates to apply to the task
   * @returns The updated task
   * @throws TaskNotFoundError if the task cannot be found
   */
  static async updateTask(taskId: string, projectId: string, updates: any) {
    // Find the task first
    const task = await TaskIdResolver.findTaskById(taskId, projectId);
    
    if (!task) {
      throw new TaskNotFoundError(taskId, projectId);
    }
    
    // For Success Factor tasks, ensure we preserve critical metadata
    if (task.origin === 'factor') {
      if (DEBUG_RESOLVER) {
        console.log(`[TASK_ID_RESOLVER] Preserving Success Factor metadata for task ${taskId}`);
      }
      
      // Ensure these fields are not modified for Success Factor tasks
      delete updates.origin;
      delete updates.sourceId; // Using correct camelCase field name
      delete updates.text;
      delete updates.stage;
    }
    
    // Apply the updates
    try {
      // Keep track of the original sourceId for potential related task updates
      const sourceId = task.sourceId;
      const isFactorTask = task.origin === 'factor';
      
      const result = await db.update(projectTasks)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(projectTasks.id, task.id),
          eq(projectTasks.projectId, projectId)
        ))
        .returning();
      
      if (result && result.length > 0) {
        if (DEBUG_RESOLVER) {
          console.log(`[TASK_ID_RESOLVER] Updated task ${taskId} successfully`);
        }
        
        // If this is a Success Factor task and we're changing completion status, 
        // sync other tasks with the same sourceId as well
        if (isFactorTask && sourceId && updates.completed !== undefined) {
          try {
            if (DEBUG_RESOLVER) {
              console.log(`[TASK_ID_RESOLVER] Syncing related tasks with sourceId ${sourceId}`);
            }
            
            // Find all other tasks with the same sourceId
            const relatedTasks = await db.query.projectTasks.findMany({
              where: and(
                eq(projectTasks.projectId, projectId),
                eq(projectTasks.sourceId, sourceId),
                ne(projectTasks.id, task.id) // Exclude the current task
              )
            });
            
            if (relatedTasks.length > 0) {
              if (DEBUG_RESOLVER) {
                console.log(`[TASK_ID_RESOLVER] Found ${relatedTasks.length} related tasks to sync`);
              }
              
              // Update all related tasks with the same completion state
              const updatePromises = relatedTasks.map(relatedTask => 
                db.update(projectTasks)
                  .set({
                    completed: updates.completed,
                    updatedAt: new Date()
                  })
                  .where(and(
                    eq(projectTasks.id, relatedTask.id),
                    eq(projectTasks.projectId, projectId)
                  ))
              );
              
              await Promise.all(updatePromises);
              
              if (DEBUG_RESOLVER) {
                console.log(`[TASK_ID_RESOLVER] Synchronized ${relatedTasks.length} related tasks`);
              }
            }
          } catch (syncError) {
            console.error(`[TASK_ID_RESOLVER] Error syncing related tasks:`, syncError);
            // Don't fail the primary update if syncing fails
          }
        }
        
        return result[0];
      }
      
      throw new Error(`Failed to update task ${taskId}`);
    } catch (error) {
      console.error(`[TASK_ID_RESOLVER] Error updating task ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all tasks for a project, with optional filtering
   * 
   * @param projectId The project ID to get tasks for
   * @param options Optional filtering options
   * @returns Array of tasks for the project
   */
  static async getTasksForProject(projectId: string, options: any = {}) {
    try {
      const tasks = await db.query.projectTasks.findMany({
        where: eq(projectTasks.projectId, projectId)
      });
      
      if (DEBUG_RESOLVER) {
        console.log(`[TASK_ID_RESOLVER] Found ${tasks.length} tasks for project ${projectId}`);
        
        // Count tasks by origin
        const originCounts = tasks.reduce((acc, task) => {
          const origin = task.origin || 'unknown';
          acc[origin] = (acc[origin] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`[TASK_ID_RESOLVER] Tasks by origin:`, originCounts);
      }
      
      return tasks;
    } catch (error) {
      console.error(`[TASK_ID_RESOLVER] Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  }
}

export default TaskIdResolver;