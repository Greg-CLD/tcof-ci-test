/**
 * Service Index
 * 
 * Exports all service singletons and initializes them
 */

import { taskLogger } from './taskLogger';
import { taskStateManager } from './taskStateManager';
import { TaskIdResolver, validateUuid } from './taskIdResolver';

// Export all services
export {
  taskLogger,
  taskStateManager,
  TaskIdResolver,
  validateUuid
};

// Function to initialize all services with database
export function initializeServices(db: any): void {
  // Enable debug flags from environment
  process.env.DEBUG_TASK_STATE = 'true';
  process.env.DEBUG_TASK_API = 'true';
  process.env.DEBUG_TASK_COMPLETION = 'true';
  process.env.DEBUG_TASK_PERSISTENCE = 'true';
  
  // Initialize services
  TaskIdResolver.initialize(db);
  taskStateManager.initialize(db);
  
  console.log('[Services] All task services initialized with debugging enabled');
}