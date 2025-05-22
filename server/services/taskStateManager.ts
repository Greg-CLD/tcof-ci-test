/**
 * Task State Manager Service
 * 
 * Provides unified task state handling with:
 * - In-memory state cache
 * - Real-time state broadcasting
 * - Retry logic for failed updates
 * - Synchronized state transitions
 * - State transition validation
 */

import { EventEmitter } from 'events';
import { validate as validateUUID } from 'uuid';
import { TaskIdResolver } from './taskIdResolver';

// Debug flags - inherit from environment
const DEBUG_TASK_STATE = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_SYNC = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_RETRY = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_CACHE = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_TRANSITION = process.env.DEBUG_TASKS === 'true';

// Task state types
export type TaskState = {
  id: string;
  projectId: string;
  text: string;
  origin: string;
  sourceId?: string;
  completed: boolean;
  stage?: string;
  updatedAt: Date;
  syncStatus?: 'synced' | 'syncing' | 'error';
  retryCount?: number;
  [key: string]: any; // Allow additional properties
};

// Task update types
export type TaskUpdate = {
  completed?: boolean;
  text?: string;
  stage?: string;
  origin?: string;
  sourceId?: string;
  [key: string]: any; // Allow additional properties
};

// Task state events
export type TaskStateEvent = {
  type: 'updated' | 'synced' | 'error';
  taskId: string;
  projectId: string;
  state: TaskState;
  error?: Error;
};

// Task sync options
type TaskSyncOptions = {
  maxRetries?: number;
  broadcastEvents?: boolean;
  storeInCache?: boolean;
};

/**
 * TaskStateManager class for unified task state handling
 * Maintains an in-memory cache of task states and manages state transitions
 */
export class TaskStateManager extends EventEmitter {
  private static instance: TaskStateManager;
  private stateCache: Map<string, TaskState>;
  private pendingUpdates: Map<string, TaskUpdate>;
  private updateQueue: Array<{ taskId: string, projectId: string, update: TaskUpdate, options: TaskSyncOptions }>;
  private processing: boolean;
  private projectsDb: any;
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    super();
    this.stateCache = new Map();
    this.pendingUpdates = new Map();
    this.updateQueue = [];
    this.processing = false;
  }
  
  /**
   * Validate a state transition to prevent invalid/duplicate completion changes
   * 
   * @param currentState The current task state
   * @param update The proposed update
   * @returns boolean indicating if the transition is valid
   */
  private validateStateTransition(currentState: TaskState | null, update: TaskUpdate): boolean {
    if (!currentState) return true;
    
    // Special handling for Success Factor tasks
    if (currentState.origin === 'factor' || currentState.source === 'factor') {
      if (!currentState.sourceId) {
        if (DEBUG_TASK_TRANSITION) {
          console.log(`[TASK_STATE_MANAGER] Invalid Success Factor task - missing sourceId`);
        }
        return false;
      }
      
      // Additional validation for Success Factor state changes
      if (update.completed !== undefined) {
        if (DEBUG_TASK_TRANSITION) {
          console.log(`[TASK_STATE_MANAGER] Success Factor task state change: ${currentState.sourceId} -> ${update.completed}`);
        }
      }
    }
    
    if (update.completed !== undefined && update.completed === currentState.completed) {
      if (DEBUG_TASK_TRANSITION) {
        console.log(`[TASK_STATE_MANAGER] Invalid state transition - already ${update.completed ? 'completed' : 'incomplete'}`);
      }
      return false;
    }
    
    if (DEBUG_TASK_TRANSITION && update.completed !== undefined) {
      console.log(`[TASK_STATE_MANAGER] Valid state transition: ${currentState.completed ? 'completed' : 'incomplete'} -> ${update.completed ? 'completed' : 'incomplete'}`);
    }
    
    return true;
  }
  
  /**
   * Get the singleton instance of TaskStateManager
   */
  public static getInstance(): TaskStateManager {
    if (!TaskStateManager.instance) {
      TaskStateManager.instance = new TaskStateManager();
    }
    return TaskStateManager.instance;
  }
  
  /**
   * Initialize the TaskStateManager with database access
   * 
   * @param projectsDb The projects database module
   */
  public initialize(projectsDb: any): void {
    this.projectsDb = projectsDb;
    
    if (DEBUG_TASK_STATE) {
      console.log('[TASK_STATE_MANAGER] Initialized');
    }
  }
  
  /**
   * Generate a cache key for a task
   * 
   * @param taskId The task ID
   * @param projectId The project ID
   * @returns The cache key
   */
  private getCacheKey(taskId: string, projectId: string): string {
    return `${projectId}:${taskId}`;
  }
  
  /**
   * Get a task state from the cache
   * 
   * @param taskId The task ID
   * @param projectId The project ID
   * @returns The task state or undefined if not in cache
   */
  public getTaskState(taskId: string, projectId: string): TaskState | undefined {
    const key = this.getCacheKey(taskId, projectId);
    const state = this.stateCache.get(key);
    
    if (DEBUG_TASK_CACHE && state) {
      console.log(`[TASK_STATE_MANAGER] Cache hit for task ${taskId}`);
    } else if (DEBUG_TASK_CACHE) {
      console.log(`[TASK_STATE_MANAGER] Cache miss for task ${taskId}`);
    }
    
    return state;
  }
  
  /**
   * Cache a task state
   * 
   * @param state The task state to cache
   */
  public cacheTaskState(state: TaskState | undefined): void {
    if (!state || !state.id || !state.projectId) {
      console.error('[TASK_STATE_MANAGER] Cannot cache task state without id and projectId');
      return;
    }
    
    const key = this.getCacheKey(state.id, state.projectId);
    this.stateCache.set(key, {...state, syncStatus: 'synced'});
    
    if (DEBUG_TASK_CACHE) {
      console.log(`[TASK_STATE_MANAGER] Cached state for task ${state.id}`);
    }
  }
  
  /**
   * Clear task state from cache
   * 
   * @param taskId The task ID
   * @param projectId The project ID
   */
  public clearTaskState(taskId: string, projectId: string): void {
    const key = this.getCacheKey(taskId, projectId);
    this.stateCache.delete(key);
    
    if (DEBUG_TASK_CACHE) {
      console.log(`[TASK_STATE_MANAGER] Cleared state for task ${taskId}`);
    }
  }
  
  /**
   * Update a task's state with optimistic updates and synchronized persistence
   * 
   * @param taskId The task ID
   * @param projectId The project ID
   * @param update The task update object
   * @param options Sync options
   * @returns Promise resolving to the updated task state
   */
  public async updateTaskState(
    taskId: string, 
    projectId: string, 
    update: TaskUpdate,
    options: TaskSyncOptions = {}
  ): Promise<TaskState> {
    // Default options
    const syncOptions = {
      maxRetries: 3,
      broadcastEvents: true,
      storeInCache: true,
      ...options
    };
    
    if (!this.projectsDb) {
      throw new Error('[TASK_STATE_MANAGER] Not initialized - call initialize() first');
    }
    
    if (!taskId || !projectId) {
      throw new Error('[TASK_STATE_MANAGER] Task ID and Project ID are required');
    }
    
    // Create cache key
    const cacheKey = this.getCacheKey(taskId, projectId);
    
    // Get the current state from cache or database
    let currentState: TaskState | undefined = this.stateCache.get(cacheKey);
    
    if (!currentState) {
      if (DEBUG_TASK_STATE) {
        console.log(`[TASK_STATE_MANAGER] No cached state for task ${taskId}, fetching from database`);
      }
      
      // Try to find the task using TaskIdResolver
      try {
        const lookupResult = await TaskIdResolver.findTaskById(projectId, taskId, this.projectsDb);
        if (lookupResult.task) {
          currentState = {
            ...lookupResult.task,
            syncStatus: 'synced',
            updatedAt: lookupResult.task.updatedAt || new Date()
          } as TaskState;
          
          if (syncOptions.storeInCache) {
            this.cacheTaskState(currentState);
          }
        }
      } catch (err) {
        console.error(`[TASK_STATE_MANAGER] Error fetching task state:`, err);
      }
    }
    
    // Validate the state transition if it involves completion status
    if (currentState && update.hasOwnProperty('completed')) {
      const isValidTransition = this.validateStateTransition(currentState, update);
      
      if (!isValidTransition) {
        if (DEBUG_TASK_STATE) {
          console.log(`[TASK_STATE_MANAGER] Skipping invalid state transition for task ${taskId}`);
        }
        
        // Return current state if transition is invalid
        return currentState;
      }
    }
    
    // Create a new state by merging current state and update
    const optimisticState: TaskState = currentState ? {
      ...currentState,
      ...update,
      syncStatus: 'syncing',
      updatedAt: new Date()
    } : {
      id: taskId,
      projectId: projectId,
      text: update.text || '',
      origin: update.origin || 'custom',
      sourceId: update.sourceId,
      completed: update.completed !== undefined ? update.completed : false,
      stage: update.stage || 'identification',
      syncStatus: 'syncing',
      updatedAt: new Date(),
      retryCount: 0
    };
    
    // Update the cache with optimistic state
    if (syncOptions.storeInCache) {
      this.stateCache.set(cacheKey, optimisticState);
      
      if (DEBUG_TASK_STATE) {
        console.log(`[TASK_STATE_MANAGER] Updated cache with optimistic state for task ${taskId}`);
        if (update.hasOwnProperty('completed')) {
          console.log(`[TASK_STATE_MANAGER] Setting completion to: ${update.completed}`);
        }
      }
    }
    
    // Broadcast optimistic update event
    if (syncOptions.broadcastEvents) {
      this.emit('state:updated', {
        type: 'updated',
        taskId,
        projectId,
        state: optimisticState
      });
    }
    
    // Queue the update for processing
    this.updateQueue.push({
      taskId,
      projectId,
      update,
      options: syncOptions
    });
    
    // Start processing queue if not already processing
    if (!this.processing) {
      this.processUpdateQueue();
    }
    
    // Return the optimistic state
    return optimisticState;
  }
  
  /**
   * Process the update queue asynchronously
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.processing || this.updateQueue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      if (!update) continue;
      
      const { taskId, projectId, update: taskUpdate, options } = update;
      
      if (DEBUG_TASK_SYNC) {
        console.log(`[TASK_STATE_MANAGER] Processing update for task ${taskId}`);
      }
      
      try {
        // Use TaskIdResolver to find the task
        const lookupResult = await TaskIdResolver.findTaskById(projectId, taskId, this.projectsDb);
        
        if (!lookupResult.task) {
          throw new Error(`Task not found: ${taskId}`);
        }
        
        // Update the task in the database
        const updatedTask = await this.projectsDb.updateTask(lookupResult.task.id, projectId, taskUpdate);
        
        // Create the synced state
        const syncedState: TaskState = {
          ...updatedTask,
          syncStatus: 'synced',
          updatedAt: new Date()
        };
        
        // Update cache with synced state
        if (options.storeInCache) {
          this.stateCache.set(this.getCacheKey(taskId, projectId), syncedState);
        }
        
        // Broadcast synced event
        if (options.broadcastEvents) {
          this.emit('state:synced', {
            type: 'synced',
            taskId,
            projectId,
            state: syncedState
          });
        }
        
        if (DEBUG_TASK_SYNC) {
          console.log(`[TASK_STATE_MANAGER] Successfully synced task ${taskId}`);
        }
        
      } catch (error) {
        console.error(`[TASK_STATE_MANAGER] Error updating task ${taskId}:`, error);
        
        // Get current state from cache
        const cacheKey = this.getCacheKey(taskId, projectId);
        const currentState = this.stateCache.get(cacheKey);
        
        if (currentState) {
          // Increment retry count
          const retryCount = (currentState.retryCount || 0) + 1;
          
          // Update state with error status
          const errorState: TaskState = {
            ...currentState,
            syncStatus: 'error',
            retryCount
          };
          
          // Update cache with error state
          if (options.storeInCache) {
            this.stateCache.set(cacheKey, errorState);
          }
          
          // Broadcast error event
          if (options.broadcastEvents) {
            this.emit('state:error', {
              type: 'error',
              taskId,
              projectId,
              state: errorState,
              error: error as Error
            });
          }
          
          // Retry update if retry count is less than max retries
          if (retryCount < (options.maxRetries || 3)) {
            if (DEBUG_TASK_RETRY) {
              console.log(`[TASK_STATE_MANAGER] Retrying update for task ${taskId} (attempt ${retryCount})`);
            }
            
            // Add back to queue with exponential backoff
            setTimeout(() => {
              this.updateQueue.push({ taskId, projectId, update: taskUpdate, options });
              
              // Start processing if not already processing
              if (!this.processing) {
                this.processUpdateQueue();
              }
            }, Math.min(1000 * Math.pow(2, retryCount), 30000));
          }
        }
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Synchronize all tasks with the same sourceId
   * 
   * @param projectId The project ID
   * @param sourceId The source ID to match
   * @param update The task update to apply
   * @returns Promise resolving to the number of tasks updated
   */
  public async syncRelatedTasks(
    projectId: string,
    sourceId: string,
    update: TaskUpdate
  ): Promise<number> {
    if (!this.projectsDb) {
      throw new Error('[TASK_STATE_MANAGER] Not initialized - call initialize() first');
    }
    
    if (!projectId || !sourceId || !validateUUID(sourceId)) {
      return 0;
    }
    
    if (DEBUG_TASK_SYNC) {
      console.log(`[TASK_STATE_MANAGER] Syncing related tasks with sourceId ${sourceId}`);
    }
    
    try {
      // Use TaskIdResolver to sync related tasks
      const syncCount = await TaskIdResolver.syncRelatedTasks(
        projectId,
        sourceId,
        update,
        this.projectsDb
      );
      
      if (DEBUG_TASK_SYNC && syncCount > 0) {
        console.log(`[TASK_STATE_MANAGER] Synchronized ${syncCount} related tasks with sourceId ${sourceId}`);
      }
      
      return syncCount;
    } catch (error) {
      console.error(`[TASK_STATE_MANAGER] Error syncing related tasks:`, error);
      return 0;
    }
  }
  
  /**
   * Get all task states for a project
   * 
   * @param projectId The project ID
   * @returns Promise resolving to an array of task states
   */
  public async getProjectTaskStates(projectId: string): Promise<TaskState[]> {
    if (!this.projectsDb) {
      throw new Error('[TASK_STATE_MANAGER] Not initialized - call initialize() first');
    }
    
    try {
      // Get all tasks for the project from the database
      const tasks = await this.projectsDb.getTasksForProject(projectId);
      
      // Convert to task states and cache them
      const taskStates: TaskState[] = tasks.map((task: Record<string, any>) => ({
        id: task.id,
        projectId: task.projectId || projectId,
        text: task.text || '',
        origin: task.origin || 'custom',
        sourceId: task.sourceId,
        completed: typeof task.completed === 'boolean' ? task.completed : false,
        stage: task.stage || 'identification',
        syncStatus: 'synced',
        updatedAt: task.updatedAt || new Date(),
        retryCount: 0
      }));
      
      // Cache task states
      taskStates.forEach(state => {
        this.cacheTaskState(state);
      });
      
      return taskStates;
    } catch (error) {
      console.error(`[TASK_STATE_MANAGER] Error getting project tasks:`, error);
      return [];
    }
  }
  
  /**
   * Clear the state cache
   */
  public clearCache(): void {
    this.stateCache.clear();
    
    if (DEBUG_TASK_CACHE) {
      console.log('[TASK_STATE_MANAGER] Cache cleared');
    }
  }
}

// Export singleton instance
export default TaskStateManager.getInstance();