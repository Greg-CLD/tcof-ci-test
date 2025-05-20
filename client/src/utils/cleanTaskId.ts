/**
 * Utility function for cleaning task IDs
 * 
 * Extracts the UUID part from a compound task ID
 * Format example: 2f565bf9-70c7-5c41-93e7-c6c4cde32312-suffix
 * Returns: 2f565bf9-70c7-5c41-93e7-c6c4cde32312
 * 
 * @param taskId The task ID to clean
 * @returns The cleaned UUID 
 */
export function cleanTaskId(taskId: string): string {
  if (!taskId) return '';
  
  // Extract the first 5 segments of the UUID (standard UUID format)
  return taskId.split('-').slice(0, 5).join('-');
}

/**
 * Creates a proper API endpoint for task operations
 * 
 * @param projectId The project ID
 * @param taskId The task ID (will be cleaned automatically)
 * @returns The properly formatted API endpoint
 */
export function createTaskEndpoint(projectId: string, taskId: string): string {
  const cleanId = cleanTaskId(taskId);
  return `/api/projects/${projectId}/tasks/${cleanId}`;
}

/**
 * Creates a proper API endpoint for success factor task operations
 * 
 * @param factorId The success factor ID
 * @param taskId The task ID (will be cleaned automatically)
 * @returns The properly formatted API endpoint
 */
export function createFactorTaskEndpoint(factorId: string, taskId: string): string {
  const cleanId = cleanTaskId(taskId);
  return `/api/success-factors/${factorId}/tasks/${cleanId}`;
}