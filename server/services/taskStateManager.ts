/**
 * TaskStateManager Service
 * 
 * Manages the lifecycle of task state updates, including:
 * - Optimistic updates for UI responsiveness
 * - Transaction management for database persistence
 * - State transition validation
 * - Related task synchronization
 * - Cache invalidation and state broadcasting
 */

import { v4 as uuidv4 } from 'uuid';
import { taskLogger } from './taskLogger';
import { getTaskIdResolver } from './taskIdResolver';

// Task update options
interface TaskUpdateOptions {
  maxRetries?: number;
  broadcastEvents?: boolean;
  storeInCache?: boolean;
  validateState?: boolean;
  syncRelatedTasks?: boolean;
}

// Task update queue item
interface TaskUpdateQueueItem {
  id: string;
  taskId: string;
  projectId: string;
  updates: any;
  options: TaskUpdateOptions;
  timestamp: number;
  attempts: number;
  retryAfter?: number;
  error?: Error;
}

// Task update status
interface TaskUpdateStatus {
  success: boolean;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: Error;
  taskId?: string;
  originalTaskId?: string;
  data?: any;
}

// Class implementation
export class TaskStateManager {
  private updateQueue: TaskUpdateQueueItem[] = [];
  private taskCache: Map<string, any> = new Map();
  private pendingUpdates: Set<string> = new Set();
  private processingQueue: boolean = false;
  private projectsDb: any = null;
  private debugEnabled: boolean = false;
  
  constructor() {
    // Check if debugging is enabled via environment variables
    this.debugEnabled = process.env.DEBUG_TASKS === 'true' || 
                        process.env.DEBUG_TASK_STATE === 'true' || 
                        process.env.DEBUG_TASK_COMPLETION === 'true' || 
                        process.env.DEBUG_TASK_PERSISTENCE === 'true';
    
    if (this.debugEnabled) {
      console.log('[TaskStateManager] Initialized with debugging enabled');
    }
    
    // Start queue processing
    this.processUpdateQueue();
  }
  
  /**
   * Initialize with database connection
   */
  initialize(db: any): void {
    if (!db) {
      throw new Error('[TaskStateManager] Database connection is required');
    }
    
    this.projectsDb = db;
    
    if (this.debugEnabled) {
      console.log('[TaskStateManager] Initialized with database connection');
    }
  }
  
  /**
   * Update task state with optimistic updating and persistence
   */
  async updateTaskState(taskId: string, projectId: string, updates: any, options: TaskUpdateOptions = {}): Promise<any> {
    if (!this.projectsDb) {
      throw new Error('TaskStateManager not initialized with database connection');
    }
    
    // Create a queue item for this update
    const queueItem: TaskUpdateQueueItem = {
      id: uuidv4(),
      taskId,
      projectId,
      updates,
      options: {
        maxRetries: options.maxRetries || 3,
        broadcastEvents: options.broadcastEvents ?? true,
        storeInCache: options.storeInCache ?? true,
        validateState: options.validateState ?? true,
        syncRelatedTasks: options.syncRelatedTasks ?? true
      },
      timestamp: Date.now(),
      attempts: 0
    };
    
    if (this.debugEnabled) {
      console.log(`[TaskStateManager] Queuing task update for ${taskId}`);
      console.log(`[TaskStateManager] - Project ID: ${projectId}`);
      console.log(`[TaskStateManager] - Queue ID: ${queueItem.id}`);
      
      if (updates.completed !== undefined) {
        console.log(`[TaskStateManager] - Completed state: ${updates.completed}`);
      }
    }
    
    // Add to pending updates set
    const pendingKey = `${projectId}:${taskId}`;
    this.pendingUpdates.add(pendingKey);
    
    // Add to queue
    this.updateQueue.push(queueItem);
    
    // Start processing queue if not already processing
    if (!this.processingQueue) {
      this.processUpdateQueue();
    }
    
    // For optimistic updates, find the task and update it in memory
    let existingTask: any;
    
    try {
      // First try to find it in the cache
      if (this.taskCache.has(pendingKey)) {
        existingTask = this.taskCache.get(pendingKey);
        
        if (this.debugEnabled) {
          console.log(`[TaskStateManager] Found task in cache: ${taskId}`);
        }
      } else {
        // Use TaskIdResolver with proper database connection
        const taskIdResolver = getTaskIdResolver(this.projectsDb);
        const operationId = taskLogger.startOperation('findTaskByIdForUpdate', taskId, projectId);
        existingTask = await taskIdResolver.findTaskById(taskId, projectId);
        taskLogger.endOperation(operationId, !!existingTask);
        
        if (existingTask && options.storeInCache) {
          this.taskCache.set(pendingKey, existingTask);
          
          if (this.debugEnabled) {
            console.log(`[TaskStateManager] Added task to cache: ${taskId}`);
          }
        }
      }
    } catch (error) {
      console.error(`[TaskStateManager] Error finding task ${taskId}:`, error);
      throw error;
    }
    
    if (!existingTask) {
      const error = new Error(`Task not found: ${taskId}`);
      (error as any).code = 'TASK_NOT_FOUND';
      throw error;
    }
    
    // Create optimistic update version of the task
    const optimisticTask = {
      ...existingTask,
      ...updates,
      updatedAt: new Date()
    };
    
    // Store in cache for optimistic responses
    if (options.storeInCache) {
      this.taskCache.set(pendingKey, optimisticTask);
    }
    
    // Always preserve critical fields for Success Factor tasks
    if (existingTask.origin === 'factor' || existingTask.origin === 'success-factor') {
      optimisticTask.origin = existingTask.origin;
      optimisticTask.sourceId = existingTask.sourceId;
    }
    
    if (this.debugEnabled) {
      console.log(`[TaskStateManager] Created optimistic update for ${taskId}`);
      
      // Log important field differences
      if (updates.completed !== undefined && existingTask.completed !== updates.completed) {
        console.log(`[TaskStateManager] - Completed changed: ${existingTask.completed} -> ${updates.completed}`);
      }
    }
    
    // Return the optimistic task immediately
    return {
      ...optimisticTask,
      syncStatus: 'pending'
    };
  }
  
  /**
   * Process the update queue
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.processingQueue || this.updateQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    if (this.debugEnabled) {
      console.log(`[TaskStateManager] Processing update queue (${this.updateQueue.length} items)`);
    }
    
    try {
      // Sort queue by timestamp
      this.updateQueue.sort((a, b) => a.timestamp - b.timestamp);
      
      // Process each item in the queue
      for (let i = 0; i < this.updateQueue.length; i++) {
        const item = this.updateQueue[i];
        
        // Skip items that are scheduled for retry later
        if (item.retryAfter && item.retryAfter > Date.now()) {
          continue;
        }
        
        try {
          // Process this item
          const operationId = taskLogger.startOperation('processQueueItem', item.taskId, item.projectId);
          
          if (this.debugEnabled) {
            console.log(`[TaskStateManager] Processing queue item ${item.id} for task ${item.taskId}`);
            console.log(`[TaskStateManager] - Attempt ${item.attempts + 1} of ${item.options.maxRetries}`);
          }
          
          // Update attempt count
          item.attempts++;
          
          // Use TaskIdResolver with proper database connection
          const taskIdResolver = getTaskIdResolver(this.projectsDb);
          const task = await taskIdResolver.findTaskById(item.taskId, item.projectId);
          
          if (!task) {
            const error = new Error(`Task not found: ${item.taskId}`);
            (error as any).code = 'TASK_NOT_FOUND';
            throw error;
          }
          
          // Create update data with critical fields preserved
          const updateData = { ...item.updates };
          
          // Always preserve critical fields for Success Factor tasks
          if (task.origin === 'factor' || task.origin === 'success-factor') {
            updateData.origin = task.origin;
            updateData.sourceId = task.sourceId;
            
            if (this.debugEnabled) {
              console.log(`[TaskStateManager] Preserving Success Factor fields for ${item.taskId}`);
              console.log(`[TaskStateManager] - Origin: ${task.origin}`);
              console.log(`[TaskStateManager] - Source ID: ${task.sourceId}`);
            }
          }
          
          // Track database operation timing
          const dbStartTime = Date.now();
          
          // Update the task in the database using the resolved ID
          const updatedTask = await this.projectsDb.updateTask(task.id, item.projectId, updateData);
          
          // Log database operation
          const dbDuration = Date.now() - dbStartTime;
          taskLogger.logDatabaseOperation('update', item.taskId, item.projectId, !!updatedTask, dbDuration);
          
          if (!updatedTask) {
            throw new Error(`Failed to update task ${item.taskId} in database`);
          }
          
          // Remove from pending updates
          const pendingKey = `${item.projectId}:${item.taskId}`;
          this.pendingUpdates.delete(pendingKey);
          
          // Update cache with the latest version
          if (item.options.storeInCache) {
            this.taskCache.set(pendingKey, updatedTask);
          }
          
          // Synchronize related tasks for Success Factor tasks
          if (item.options.syncRelatedTasks && 
              (task.origin === 'factor' || task.origin === 'success-factor') && 
              task.sourceId && 
              item.updates.completed !== undefined) {
            
            await this.syncRelatedTasks(item.projectId, task.sourceId, { 
              completed: item.updates.completed 
            });
          }
          
          // Remove this item from the queue
          this.updateQueue.splice(i, 1);
          i--; // Adjust index since we removed an item
          
          // Log success
          if (this.debugEnabled) {
            console.log(`[TaskStateManager] Successfully processed queue item ${item.id}`);
            console.log(`[TaskStateManager] - Task ID: ${item.taskId}`);
            console.log(`[TaskStateManager] - Updated fields:`, JSON.stringify(updateData, null, 2));
          }
          
          taskLogger.endOperation(operationId, true);
          
        } catch (error) {
          console.error(`[TaskStateManager] Error processing queue item ${item.id}:`, error);
          
          // Store the error
          item.error = error as Error;
          
          // Handle retries
          if (item.attempts < item.options.maxRetries!) {
            // Exponential backoff for retries
            const retryDelay = Math.pow(2, item.attempts) * 500;
            item.retryAfter = Date.now() + retryDelay;
            
            if (this.debugEnabled) {
              console.log(`[TaskStateManager] Scheduled retry for item ${item.id} in ${retryDelay}ms`);
            }
          } else {
            // Remove from queue after max retries
            this.updateQueue.splice(i, 1);
            i--; // Adjust index since we removed an item
            
            // Remove from pending updates
            const pendingKey = `${item.projectId}:${item.taskId}`;
            this.pendingUpdates.delete(pendingKey);
            
            if (this.debugEnabled) {
              console.log(`[TaskStateManager] Failed to process queue item ${item.id} after ${item.attempts} attempts`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[TaskStateManager] Error processing update queue:', error);
    } finally {
      this.processingQueue = false;
      
      // If there are still items in the queue, schedule another processing run
      if (this.updateQueue.length > 0) {
        setTimeout(() => this.processUpdateQueue(), 100);
      }
    }
  }
  
  /**
   * Synchronize related tasks with the same sourceId
   */
  async syncRelatedTasks(projectId: string, sourceId: string, updates: any): Promise<number> {
    if (!this.projectsDb) {
      throw new Error('TaskStateManager not initialized with database connection');
    }
    
    try {
      const operationId = taskLogger.startOperation('syncRelatedTasks', sourceId, projectId);
      
      if (this.debugEnabled) {
        console.log(`[TaskStateManager] Synchronizing related tasks for source ID: ${sourceId}`);
        console.log(`[TaskStateManager] - Project ID: ${projectId}`);
        console.log(`[TaskStateManager] - Updates:`, JSON.stringify(updates, null, 2));
      }
      
      // Find all tasks with this sourceId
      const relatedTasks = await this.projectsDb.findTasksBySourceId(projectId, sourceId);
      
      if (!relatedTasks || relatedTasks.length === 0) {
        if (this.debugEnabled) {
          console.log(`[TaskStateManager] No related tasks found for source ID: ${sourceId}`);
        }
        
        taskLogger.endOperation(operationId, true);
        return 0;
      }
      
      if (this.debugEnabled) {
        console.log(`[TaskStateManager] Found ${relatedTasks.length} related tasks for source ID: ${sourceId}`);
      }
      
      // Track number of successfully updated tasks
      let updatedCount = 0;
      
      // Update each related task
      for (const task of relatedTasks) {
        try {
          // Skip tasks that already have the desired state
          let skipUpdate = true;
          
          for (const [key, value] of Object.entries(updates)) {
            if (task[key] !== value) {
              skipUpdate = false;
              break;
            }
          }
          
          if (skipUpdate) {
            if (this.debugEnabled) {
              console.log(`[TaskStateManager] Skipping task ${task.id} as it already has the desired state`);
            }
            continue;
          }
          
          // Update task in database
          await this.projectsDb.updateTask(task.id, projectId, updates);
          
          // Update task in cache
          const cacheKey = `${projectId}:${task.id}`;
          if (this.taskCache.has(cacheKey)) {
            const cachedTask = this.taskCache.get(cacheKey);
            this.taskCache.set(cacheKey, { ...cachedTask, ...updates });
          }
          
          updatedCount++;
          
          if (this.debugEnabled) {
            console.log(`[TaskStateManager] Updated related task: ${task.id}`);
          }
        } catch (error) {
          console.error(`[TaskStateManager] Error updating related task ${task.id}:`, error);
        }
      }
      
      if (this.debugEnabled) {
        console.log(`[TaskStateManager] Synchronized ${updatedCount} related tasks for source ID: ${sourceId}`);
      }
      
      taskLogger.endOperation(operationId, true);
      return updatedCount;
    } catch (error) {
      console.error(`[TaskStateManager] Error synchronizing related tasks for source ID ${sourceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get task update status
   */
  getTaskUpdateStatus(taskId: string, projectId: string): TaskUpdateStatus {
    const pendingKey = `${projectId}:${taskId}`;
    
    // Check if task has pending updates
    const isPending = this.pendingUpdates.has(pendingKey);
    
    // Find the task in the queue
    const queueItem = this.updateQueue.find(item => 
      item.taskId === taskId && item.projectId === projectId
    );
    
    // Determine sync status
    let syncStatus: 'pending' | 'syncing' | 'synced' | 'failed' = 'synced';
    
    if (isPending) {
      syncStatus = queueItem && queueItem.attempts > 0 ? 'syncing' : 'pending';
    } else if (queueItem && queueItem.error) {
      syncStatus = 'failed';
    }
    
    return {
      success: syncStatus === 'synced',
      syncStatus,
      error: queueItem?.error,
      taskId,
      originalTaskId: queueItem?.taskId
    };
  }
  
  /**
   * Clear task cache
   */
  clearTaskCache(projectId?: string): void {
    if (projectId) {
      // Clear only tasks for this project
      const keysToDelete: string[] = [];
      
      this.taskCache.forEach((_, key) => {
        if (key.startsWith(`${projectId}:`)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.taskCache.delete(key));
      
      if (this.debugEnabled) {
        console.log(`[TaskStateManager] Cleared task cache for project: ${projectId}`);
        console.log(`[TaskStateManager] - Removed ${keysToDelete.length} items`);
      }
    } else {
      // Clear all tasks
      this.taskCache.clear();
      
      if (this.debugEnabled) {
        console.log(`[TaskStateManager] Cleared entire task cache`);
      }
    }
  }
}

// Export singleton instance
export const taskStateManager = new TaskStateManager();