/**
 * Service Index
 * 
 * Exports all service singletons and initializes them with database connectivity
 */

import { taskLogger } from './taskLogger';
import { taskStateManager } from './taskStateManager';
import { getTaskIdResolver, validateUuid, TaskIdResolver } from './taskIdResolver';

// Export all services
export {
  taskLogger,
  taskStateManager,
  getTaskIdResolver,
  TaskIdResolver,
  validateUuid
};

// Function to initialize all services with database
export function initializeServices(db: any): void {
  if (!db) {
    throw new Error('[initializeServices] Database connection is required!');
  }
  
  // Enable debug flags from environment for comprehensive diagnostic information
  process.env.DEBUG_TASK_STATE = 'true';
  process.env.DEBUG_TASK_API = 'true';
  process.env.DEBUG_TASK_COMPLETION = 'true';
  process.env.DEBUG_TASK_PERSISTENCE = 'true';
  process.env.DEBUG_TASKS = 'true';
  
  // Initialize TaskIdResolver with database connection
  const taskIdResolver = getTaskIdResolver(db);
  console.log('[Services] TaskIdResolver initialized with database connection');
  
  // Initialize TaskStateManager with database connection
  taskStateManager.initialize(db);
  console.log('[Services] TaskStateManager initialized with database connection');
  
  console.log('[Services] All task services successfully initialized with debugging enabled');
}