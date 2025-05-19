/**
 * Debug configuration constants
 * These flags control the visibility of debug logs throughout the application
 */

export const DEBUG = process.env.NODE_ENV === 'development';
export const DEBUG_TASKS = DEBUG && process.env.DEBUG_TASKS === 'true';
export const DEBUG_FILTERS = DEBUG && process.env.DEBUG_FILTERS === 'true';
export const DEBUG_FILES = DEBUG && process.env.DEBUG_FILES === 'true';