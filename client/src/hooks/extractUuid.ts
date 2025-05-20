/**
 * Utility functions for handling UUID extraction in task operations
 * These functions are used to ensure proper ID handling in API requests
 */

/**
 * Extract the UUID part from a potentially compound task ID
 * SuccessFactor tasks use a compound ID format: uuid-suffix
 * This function extracts just the UUID part for API calls
 * 
 * @param id The task ID which might be a compound ID
 * @returns The extracted UUID part only
 */
export function extractUuid(id: string): string {
  if (!id) return id;
  // Keep just the first 5 segments of a UUID (standard format)
  return id.split('-').slice(0, 5).join('-');
}

/**
 * Ensure projectId is always a string for logging purposes
 * 
 * @param projectId The project ID which might be undefined or null
 * @returns A string representation of the project ID or 'unknown-project'
 */
export function safeProjectId(projectId: string | null | undefined): string {
  return projectId || 'unknown-project';
}