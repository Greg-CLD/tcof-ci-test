/**
 * TaskLogger Service
 * 
 * Comprehensive diagnostic and instrumentation service for task operations
 * Provides detailed logging, timing, error tracking and field-level comparison
 * for task state transitions and updates.
 */

import { v4 as uuidv4 } from 'uuid';

// Define task error code types for consistent error handling
export enum TaskErrorCodes {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_TASK_ID = 'INVALID_TASK_ID',
  INVALID_PROJECT_ID = 'INVALID_PROJECT_ID',
  
  // Not found errors
  NOT_FOUND = 'TASK_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  
  // Permission errors
  ACCESS_DENIED = 'TASK_ACCESS_DENIED',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  
  // State management errors
  STATE_TRANSITION_ERROR = 'STATE_TRANSITION_ERROR',
  UPDATE_CONFLICT = 'UPDATE_CONFLICT',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_SERVER_ERROR',
  TIMEOUT = 'REQUEST_TIMEOUT'
}

// Type for operation tracking
interface Operation {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: Error | null;
  metadata: Record<string, any>;
}

// Type for task update details
interface TaskUpdateDetails {
  taskId: string;
  projectId: string;
  timestamp: string;
  originalTask: any;
  updatedTask: any;
  updateData: any;
  fieldChanges: Record<string, { before: any; after: any }>;
  preservedFields: string[];
  operation: {
    id: string;
    duration: number;
    success: boolean;
  };
}

// Class implementation
export class TaskLogger {
  private operations: Map<string, Operation> = new Map();
  private taskUpdates: Map<string, TaskUpdateDetails> = new Map();
  private activeOperations: Set<string> = new Set();
  private debugEnabled: boolean = false;
  
  constructor() {
    // Check if debugging is enabled via environment variables
    this.debugEnabled = process.env.DEBUG_TASKS === 'true' || 
                        process.env.DEBUG_TASK_STATE === 'true' || 
                        process.env.DEBUG_TASK_API === 'true' || 
                        process.env.DEBUG_TASK_COMPLETION === 'true' || 
                        process.env.DEBUG_TASK_PERSISTENCE === 'true';
    
    if (this.debugEnabled) {
      console.log('[TaskLogger] Initialized with debugging enabled');
    }
  }
  
  /**
   * Start tracking a new operation
   */
  startOperation(name: string, taskId?: string, projectId?: string): string {
    const operationId = uuidv4();
    const operation: Operation = {
      id: operationId,
      name,
      startTime: Date.now(),
      metadata: {
        taskId,
        projectId,
        timestamp: new Date().toISOString()
      }
    };
    
    this.operations.set(operationId, operation);
    this.activeOperations.add(operationId);
    
    if (this.debugEnabled) {
      console.log(`[TaskLogger] Started operation '${name}' with ID ${operationId}`);
      if (taskId) console.log(`[TaskLogger] - Task ID: ${taskId}`);
      if (projectId) console.log(`[TaskLogger] - Project ID: ${projectId}`);
    }
    
    return operationId;
  }
  
  /**
   * End tracking an operation and record results
   */
  endOperation(operationId: string, success: boolean, error?: Error): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.warn(`[TaskLogger] Attempted to end unknown operation: ${operationId}`);
      return;
    }
    
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.success = success;
    operation.error = error || null;
    
    this.activeOperations.delete(operationId);
    
    if (this.debugEnabled) {
      console.log(`[TaskLogger] Ended operation '${operation.name}' (${operationId})`);
      console.log(`[TaskLogger] - Duration: ${operation.duration}ms`);
      console.log(`[TaskLogger] - Success: ${success}`);
      
      if (error) {
        console.error(`[TaskLogger] - Error: ${error.message}`);
        console.error(`[TaskLogger] - Stack: ${error.stack}`);
      }
    }
  }
  
  /**
   * Log task update request details
   */
  logTaskUpdate(taskId: string, projectId: string, updateData: any): void {
    if (!this.debugEnabled) return;
    
    console.log(`[TaskLogger] Received task update request:`);
    console.log(`[TaskLogger] - Task ID: ${taskId}`);
    console.log(`[TaskLogger] - Project ID: ${projectId}`);
    
    const importantFields = ['completed', 'text', 'status', 'origin', 'sourceId'];
    const importantUpdates = Object.entries(updateData)
      .filter(([key]) => importantFields.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    console.log(`[TaskLogger] - Key updates:`, JSON.stringify(importantUpdates, null, 2));
    
    // Log full update data if very detailed debugging is enabled
    if (process.env.DEBUG_TASK_API === 'true') {
      console.log(`[TaskLogger] - Full update data:`, JSON.stringify(updateData, null, 2));
    }
  }
  
  /**
   * Compare and log differences between original and updated task
   */
  logTaskUpdateDetails(
    taskId: string,
    projectId: string,
    originalTask: any,
    updatedTask: any,
    updateData: any
  ): void {
    if (!this.debugEnabled) return;
    
    const timestamp = new Date().toISOString();
    const operationId = Array.from(this.activeOperations).find(id => {
      const op = this.operations.get(id);
      return op && op.metadata.taskId === taskId;
    }) || 'unknown';
    
    const operation = this.operations.get(operationId) || {
      id: operationId,
      duration: 0,
      success: false
    };
    
    // Compare fields
    const fieldChanges = this.compareTaskFields(originalTask, updatedTask);
    
    // Identify preserved fields (especially important for Success Factor tasks)
    const preservedFields = ['id', 'origin', 'sourceId'].filter(field => 
      originalTask[field] === updatedTask[field]
    );
    
    const updateDetails: TaskUpdateDetails = {
      taskId,
      projectId,
      timestamp,
      originalTask,
      updatedTask,
      updateData,
      fieldChanges,
      preservedFields,
      operation: {
        id: operationId,
        duration: operation.duration || 0,
        success: !!operation.success
      }
    };
    
    this.taskUpdates.set(`${taskId}_${timestamp}`, updateDetails);
    
    if (this.debugEnabled) {
      console.log(`[TaskLogger] Task update details for ${taskId}:`);
      console.log(`[TaskLogger] - Field changes:`, JSON.stringify(fieldChanges, null, 2));
      console.log(`[TaskLogger] - Preserved fields: ${preservedFields.join(', ')}`);
      
      // Log success or failure
      if (operation.success) {
        console.log(`[TaskLogger] - Update successful in ${operation.duration}ms`);
      } else {
        console.log(`[TaskLogger] - Update failed or incomplete`);
      }
      
      // Special logging for Success Factor tasks
      if (originalTask.origin === 'factor' || originalTask.origin === 'success-factor') {
        console.log(`[TaskLogger] - Success Factor task detected:`);
        console.log(`[TaskLogger]   - sourceId preserved: ${preservedFields.includes('sourceId')}`);
        console.log(`[TaskLogger]   - origin preserved: ${preservedFields.includes('origin')}`);
      }
    }
  }
  
  /**
   * Compare fields between original and updated tasks
   */
  compareTaskFields(originalTask: any, updatedTask: any): Record<string, { before: any; after: any }> {
    const changes: Record<string, { before: any; after: any }> = {};
    
    // Define fields to compare
    const fieldsToCompare = [
      'id', 'text', 'completed', 'status', 'priority', 
      'origin', 'sourceId', 'stage', 'notes', 'dueDate'
    ];
    
    // Compare each field
    fieldsToCompare.forEach(field => {
      if (originalTask[field] !== updatedTask[field]) {
        changes[field] = {
          before: originalTask[field],
          after: updatedTask[field]
        };
      }
    });
    
    return changes;
  }
  
  /**
   * Format a standardized error response
   */
  formatErrorResponse(
    code: TaskErrorCodes,
    message: string,
    details: Record<string, any> = {}
  ): any {
    const timestamp = new Date().toISOString();
    
    return {
      success: false,
      error: code,
      message,
      timestamp,
      details
    };
  }
  
  /**
   * Log task state transition
   */
  logTaskStateTransition(
    taskId: string, 
    projectId: string, 
    fromState: any, 
    toState: any, 
    triggerEvent: string
  ): void {
    if (!this.debugEnabled) return;
    
    console.log(`[TaskLogger] Task state transition for ${taskId}:`);
    console.log(`[TaskLogger] - Trigger: ${triggerEvent}`);
    
    // Only log the completed state change for brevity
    if (fromState.completed !== toState.completed) {
      console.log(`[TaskLogger] - Completed: ${fromState.completed} -> ${toState.completed}`);
    }
    
    // Log other important state changes
    ['status', 'priority'].forEach(field => {
      if (fromState[field] !== toState[field]) {
        console.log(`[TaskLogger] - ${field}: ${fromState[field]} -> ${toState[field]}`);
      }
    });
  }
  
  /**
   * Log database operations for task updates
   */
  logDatabaseOperation(
    operationType: 'query' | 'insert' | 'update' | 'delete',
    taskId: string,
    projectId: string,
    success: boolean,
    duration: number,
    error?: Error
  ): void {
    if (!this.debugEnabled) return;
    
    console.log(`[TaskLogger] Database ${operationType} for task ${taskId}:`);
    console.log(`[TaskLogger] - Duration: ${duration}ms`);
    console.log(`[TaskLogger] - Success: ${success}`);
    
    if (error) {
      console.error(`[TaskLogger] - Error: ${error.message}`);
      if (process.env.DEBUG_TASK_PERSISTENCE === 'true') {
        console.error(`[TaskLogger] - Stack: ${error.stack}`);
      }
    }
  }
  
  /**
   * Log task lookup operations
   */
  logTaskLookup(
    lookupStrategy: 'exact' | 'uuid' | 'sourceId' | 'compound' | 'partial' | 'fallback',
    taskId: string,
    projectId: string,
    success: boolean,
    resolvedId?: string,
    sourceId?: string
  ): void {
    if (!this.debugEnabled) return;
    
    console.log(`[TaskLogger] Task lookup using ${lookupStrategy} strategy:`);
    console.log(`[TaskLogger] - Original ID: ${taskId}`);
    console.log(`[TaskLogger] - Project ID: ${projectId}`);
    console.log(`[TaskLogger] - Success: ${success}`);
    
    if (success) {
      console.log(`[TaskLogger] - Resolved ID: ${resolvedId}`);
      if (sourceId) {
        console.log(`[TaskLogger] - Source ID: ${sourceId}`);
      }
    }
  }
  
  /**
   * Get operation history for a specific task
   */
  getTaskOperationHistory(taskId: string): Operation[] {
    return Array.from(this.operations.values())
      .filter(op => op.metadata.taskId === taskId)
      .sort((a, b) => a.startTime - b.startTime);
  }
  
  /**
   * Get update history for a specific task
   */
  getTaskUpdateHistory(taskId: string): TaskUpdateDetails[] {
    return Array.from(this.taskUpdates.values())
      .filter(update => update.taskId === taskId);
  }
}

// Export singleton instance
export const taskLogger = new TaskLogger();