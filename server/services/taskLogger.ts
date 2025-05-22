/**
 * Task Logger Service
 * 
 * Provides comprehensive logging and performance tracking for task operations:
 * - Request/response timing and payload logging
 * - Database transaction timing
 * - TaskStateManager queue processing metrics
 * - Field-by-field comparison for request/response
 * - Detailed error tracking with standardized error codes
 */

import { performance } from 'perf_hooks';

// Configuration
const DEBUG = process.env.DEBUG_TASKS === 'true';
const PERFORMANCE_THRESHOLD_MS = 200; // Flag queries taking longer than this
const QUEUE_STUCK_THRESHOLD_MS = 1000; // Flag tasks stuck in queue longer than this

// Standardized error codes
export const TaskErrorCodes = {
  NOT_FOUND: 'TASK_NOT_FOUND',
  ACCESS_DENIED: 'TASK_ACCESS_DENIED',
  VALIDATION_ERROR: 'TASK_VALIDATION_ERROR',
  DATABASE_ERROR: 'TASK_DATABASE_ERROR',
  TIMEOUT: 'TASK_TIMEOUT',
  UPDATE_CONFLICT: 'TASK_UPDATE_CONFLICT',
  QUEUE_OVERFLOW: 'TASK_QUEUE_OVERFLOW',
  ID_RESOLUTION_ERROR: 'TASK_ID_RESOLUTION_ERROR'
};

// Type definitions
export type TaskTimingMetric = {
  operation: string;
  taskId: string;
  projectId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  stackTrace?: string;
};

export type TaskFieldDiff = {
  field: string;
  originalValue: any;
  newValue: any;
};

// Singleton Task Logger instance
class TaskLogger {
  private static instance: TaskLogger;
  private timingMetrics: Map<string, TaskTimingMetric>;
  private operationCounter: number;
  
  private constructor() {
    this.timingMetrics = new Map();
    this.operationCounter = 0;
  }
  
  /**
   * Get the singleton TaskLogger instance
   */
  public static getInstance(): TaskLogger {
    if (!TaskLogger.instance) {
      TaskLogger.instance = new TaskLogger();
    }
    return TaskLogger.instance;
  }
  
  /**
   * Start timing an operation
   * 
   * @param operation The operation name (e.g., 'findTaskById', 'updateTask')
   * @param taskId The task ID
   * @param projectId The project ID
   * @returns Operation ID for later reference
   */
  public startOperation(operation: string, taskId: string, projectId: string): string {
    const operationId = `${Date.now()}-${++this.operationCounter}`;
    
    this.timingMetrics.set(operationId, {
      operation,
      taskId,
      projectId,
      startTime: performance.now(),
      success: false
    });
    
    if (DEBUG) {
      console.log(`[TASK_LOGGER] Started operation ${operation} for task ${taskId} in project ${projectId} (ID: ${operationId})`);
    }
    
    return operationId;
  }
  
  /**
   * End timing an operation
   * 
   * @param operationId The operation ID from startOperation
   * @param success Whether the operation was successful
   * @param error Optional error message if the operation failed
   * @returns Duration of the operation in ms
   */
  public endOperation(operationId: string, success: boolean, error?: Error): number | null {
    const metric = this.timingMetrics.get(operationId);
    if (!metric) {
      console.error(`[TASK_LOGGER] Cannot end unknown operation: ${operationId}`);
      return null;
    }
    
    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    
    if (!success && error) {
      metric.error = error.message;
      metric.stackTrace = error.stack;
    }
    
    // Log slow operations
    if (duration > PERFORMANCE_THRESHOLD_MS) {
      console.warn(`[TASK_LOGGER] ⚠️ Slow operation: ${metric.operation} for task ${metric.taskId} took ${duration.toFixed(2)}ms`);
    }
    
    if (DEBUG) {
      console.log(`[TASK_LOGGER] Finished operation ${metric.operation} for task ${metric.taskId} in ${duration.toFixed(2)}ms (success: ${success})`);
      if (!success && error) {
        console.error(`[TASK_LOGGER] Error in operation ${metric.operation}:`, error);
      }
    }
    
    return duration;
  }
  
  /**
   * Log a task update request
   * 
   * @param taskId The task ID being updated
   * @param projectId The project ID
   * @param updates The updates being applied
   */
  public logTaskUpdate(taskId: string, projectId: string, updates: any): void {
    if (DEBUG) {
      console.log(`[TASK_LOGGER] Task update request for task ${taskId} in project ${projectId}:`, updates);
    }
  }
  
  /**
   * Log task queue state
   * 
   * @param queueSize Current size of the update queue
   * @param pendingUpdates Map of pending updates
   */
  public logQueueState(queueSize: number, pendingUpdates: Map<string, any>): void {
    if (DEBUG) {
      console.log(`[TASK_LOGGER] Task update queue state: ${queueSize} items in queue`);
      
      // Check for tasks stuck in the queue
      pendingUpdates.forEach((update, key) => {
        const [taskId, projectId] = key.split('|');
        const queueTime = update.queuedAt ? Date.now() - update.queuedAt : 0;
        
        if (queueTime > QUEUE_STUCK_THRESHOLD_MS) {
          console.warn(`[TASK_LOGGER] ⚠️ Task ${taskId} stuck in queue for ${queueTime}ms`);
        }
      });
    }
  }
  
  /**
   * Compare fields between original and updated task
   * 
   * @param originalTask The original task before update
   * @param updatedTask The task after update
   * @returns Array of field differences, or null if no differences
   */
  public compareTaskFields(originalTask: any, updatedTask: any): TaskFieldDiff[] | null {
    if (!originalTask || !updatedTask) return null;
    
    const differences: TaskFieldDiff[] = [];
    
    // Get all unique keys from both objects
    const allKeys = new Set([
      ...Object.keys(originalTask),
      ...Object.keys(updatedTask)
    ]);
    
    for (const key of allKeys) {
      // Skip timestamps and internal fields
      if (key === 'updatedAt' || key === 'createdAt' || key === 'id') continue;
      
      // Check for missing keys
      if (!(key in originalTask)) {
        differences.push({
          field: key,
          originalValue: undefined,
          newValue: updatedTask[key]
        });
        continue;
      }
      
      if (!(key in updatedTask)) {
        differences.push({
          field: key,
          originalValue: originalTask[key],
          newValue: undefined
        });
        continue;
      }
      
      // Compare values
      const originalValue = originalTask[key];
      const newValue = updatedTask[key];
      
      // Special handling for null/undefined comparison
      if ((originalValue === null || originalValue === undefined) && 
          (newValue === null || newValue === undefined)) {
        continue;
      }
      
      // Compare primitive values directly, complex values with JSON.stringify
      if (typeof originalValue === 'object' || typeof newValue === 'object') {
        if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
          differences.push({ field: key, originalValue, newValue });
        }
      } else if (originalValue !== newValue) {
        differences.push({ field: key, originalValue, newValue });
      }
    }
    
    if (differences.length === 0) return null;
    
    if (DEBUG) {
      console.log(`[TASK_LOGGER] Found ${differences.length} field differences in task update:`, differences);
    }
    
    return differences;
  }
  
  /**
   * Log a detailed task update operation including all field changes
   * 
   * @param taskId The task ID
   * @param projectId The project ID
   * @param originalTask The task before update
   * @param updatedTask The task after update
   * @param requestFields Fields from the original update request
   */
  public logTaskUpdateDetails(
    taskId: string, 
    projectId: string, 
    originalTask: any, 
    updatedTask: any,
    requestFields?: any
  ): void {
    if (!DEBUG) return;
    
    console.log(`[TASK_LOGGER] Task update details for task ${taskId} in project ${projectId}:`);
    console.log('Original task:', originalTask);
    console.log('Updated task:', updatedTask);
    
    if (requestFields) {
      console.log('Original request fields:', requestFields);
      
      // Compare request fields with updated task
      const fieldsPreserved = Object.entries(requestFields).every(([key, value]) => {
        return updatedTask[key] === value;
      });
      
      if (!fieldsPreserved) {
        console.warn(`[TASK_LOGGER] ⚠️ Some request fields were not preserved in the updated task`);
      }
    }
    
    // Compare fields and log differences
    this.compareTaskFields(originalTask, updatedTask);
  }
  
  /**
   * Format an error response with standardized error code
   * 
   * @param code Error code from TaskErrorCodes
   * @param message Human-readable error message
   * @param details Additional error details
   * @returns Formatted error object for API response
   */
  public formatErrorResponse(code: string, message: string, details?: any): any {
    const error = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    };
    
    if (details) {
      error.error['details'] = details;
    }
    
    return error;
  }
  
  /**
   * Get recent timing metrics for analysis
   * 
   * @param limit Maximum number of metrics to return
   * @returns Array of timing metrics
   */
  public getRecentMetrics(limit: number = 100): TaskTimingMetric[] {
    // Convert map to array and sort by start time (descending)
    return Array.from(this.timingMetrics.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }
  
  /**
   * Calculate performance statistics
   * 
   * @returns Object with performance statistics
   */
  public getPerformanceStats(): any {
    const metrics = Array.from(this.timingMetrics.values());
    const completedMetrics = metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        completedOperations: 0,
        successRate: 0,
        averageDuration: 0,
        slowOperations: 0,
        failedOperations: 0
      };
    }
    
    const successfulOperations = completedMetrics.filter(m => m.success);
    const slowOperations = completedMetrics.filter(m => m.duration && m.duration > PERFORMANCE_THRESHOLD_MS);
    
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    
    return {
      totalOperations: metrics.length,
      completedOperations: completedMetrics.length,
      successRate: (successfulOperations.length / completedMetrics.length) * 100,
      averageDuration: totalDuration / completedMetrics.length,
      slowOperations: slowOperations.length,
      failedOperations: completedMetrics.length - successfulOperations.length
    };
  }
}

// Export the singleton instance
export const taskLogger = TaskLogger.getInstance();

// Export a helper function to standardize error responses
export function createTaskErrorResponse(statusCode: number, errorCode: string, message: string, details?: any): any {
  return {
    status: statusCode,
    body: taskLogger.formatErrorResponse(errorCode, message, details)
  };
}