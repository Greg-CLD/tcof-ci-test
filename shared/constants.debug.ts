
/**
 * Debug configuration constants for TCOF Toolkit
 * 
 * This module provides consistent debug flags across client and server components
 * with safe environment variable access patterns for both browser and Node.js contexts.
 * 
 * Usage:
 * ```
 * import { DEBUG_TASK_COMPLETION } from '@shared/constants.debug';
 * 
 * if (DEBUG_TASK_COMPLETION) {
 *   console.log('[DEBUG_TASK_COMPLETION] Task completion status changed:', newValue);
 * }
 * ```
 */

/**
 * Safely gets an environment variable from either client or server context
 * Falls back gracefully between Vite's import.meta.env and Node's process.env
 */
function getEnvVar(name: string, defaultValue: string = 'false'): string {
  // Try browser context first (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] ?? defaultValue;
  }
  
  // Fall back to Node.js context
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] ?? defaultValue;
  }
  
  // Ultimate fallback
  return defaultValue;
}

// Detect if we're in development mode
const isDev = 
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') || 
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

// Primary debug flags
export const DEBUG = isDev;
// Temporarily enable task debugging for the PUT/UUID bug investigation
export const DEBUG_TASKS = isDev;
export const DEBUG_FILTERS = isDev && (getEnvVar('VITE_DEBUG_FILTERS', 'false') === 'true' || getEnvVar('DEBUG_FILTERS', 'false') === 'true');
export const DEBUG_FILES = isDev && (getEnvVar('VITE_DEBUG_FILES', 'false') === 'true' || getEnvVar('DEBUG_FILES', 'false') === 'true');

// Granular task lifecycle debug flags
// These can be individually controlled via environment variables or enabled as a group via DEBUG_TASKS
export const DEBUG_TASK_API = isDev && (
  DEBUG_TASKS || 
  getEnvVar('VITE_DEBUG_TASK_API', 'false') === 'true' || 
  getEnvVar('DEBUG_TASK_API', 'false') === 'true'
);

export const DEBUG_TASK_MAPPING = isDev && (
  DEBUG_TASKS || 
  getEnvVar('VITE_DEBUG_TASK_MAPPING', 'false') === 'true' || 
  getEnvVar('DEBUG_TASK_MAPPING', 'false') === 'true'
);

export const DEBUG_TASK_COMPLETION = isDev && (
  DEBUG_TASKS || 
  getEnvVar('VITE_DEBUG_TASK_COMPLETION', 'false') === 'true' || 
  getEnvVar('DEBUG_TASK_COMPLETION', 'false') === 'true'
);

export const DEBUG_TASK_VALIDATION = isDev && (
  DEBUG_TASKS || 
  getEnvVar('VITE_DEBUG_TASK_VALIDATION', 'false') === 'true' || 
  getEnvVar('DEBUG_TASK_VALIDATION', 'false') === 'true'
);

export const DEBUG_TASK_PERSISTENCE = isDev && (
  DEBUG_TASKS || 
  getEnvVar('VITE_DEBUG_TASK_PERSISTENCE', 'false') === 'true' || 
  getEnvVar('DEBUG_TASK_PERSISTENCE', 'false') === 'true'
);

/**
 * Debug flag for tracking task state transitions
 * Used to trace the changes in task state during the task lifecycle
 * Especially helpful for diagnosing the SuccessFactor task completion bug
 */
export const DEBUG_TASK_STATE = isDev && (
  DEBUG_TASKS || 
  getEnvVar('VITE_DEBUG_TASK_STATE', 'false') === 'true' || 
  getEnvVar('DEBUG_TASK_STATE', 'false') === 'true'
);

// In production all flags evaluate to false via the `isDev` check above,
// so additional mutation of the module exports is unnecessary and breaks
// when using ESM.  The previous CommonJS logic has been removed.
