
/**
 * Debug configuration constants
 * These flags control the visibility of debug logs throughout the application
 */

// Check if we're in development by looking for Vite's import.meta.env
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

export const DEBUG = isDev;
export const DEBUG_TASKS = isDev && (import.meta.env?.VITE_DEBUG_TASKS ?? 'false') === 'true';
export const DEBUG_FILTERS = isDev && (import.meta.env?.VITE_DEBUG_FILTERS ?? 'false') === 'true';
export const DEBUG_FILES = isDev && (import.meta.env?.VITE_DEBUG_FILES ?? 'false') === 'true';

// Granular task lifecycle debug flags
export const DEBUG_TASK_API = DEBUG_TASKS;       // Logs for task API requests/responses
export const DEBUG_TASK_MAPPING = DEBUG_TASKS;   // Logs for task data transformation/mapping
export const DEBUG_TASK_COMPLETION = DEBUG_TASKS; // Logs for task completion state changes
export const DEBUG_TASK_VALIDATION = DEBUG_TASKS; // Logs for task data validation
export const DEBUG_TASK_PERSISTENCE = DEBUG_TASKS; // Logs for task storage/persistence ops
