/**
 * Network activity logging utility for diagnosing task persistence issues
 * 
 * This module provides consistent logging patterns for network requests,
 * focusing specifically on task-related operations to aid in debugging
 * the UUID extraction and task persistence bugs.
 */

/**
 * Log network request details for task operations
 * @param operation The operation being performed (e.g., 'updateTask', 'deleteTask')
 * @param rawId The original task ID (possibly compound)
 * @param cleanId The extracted clean UUID
 * @param endpoint The API endpoint being used
 * @param projectId The project ID
 */
export function logTaskNetworkRequest(
  operation: string,
  rawId: string,
  cleanId: string,
  endpoint: string,
  projectId: string | null | undefined
) {
  console.log('[NET]', { 
    operation, 
    rawId, 
    cleanId, 
    endpoint,
    projectId
  });
  
  // Additional trace logging for compound IDs
  if (rawId !== cleanId) {
    console.log('[TRACE_NET]', `Task ID was cleaned: ${rawId} → ${cleanId}`);
  }
}

/**
 * Log network response details for task operations
 * @param operation The operation that was performed
 * @param status HTTP status code
 * @param taskId The task ID
 * @param success Whether the operation was successful
 */
export function logTaskNetworkResponse(
  operation: string,
  status: number,
  taskId: string,
  success: boolean
) {
  console.log('[NET]', { 
    operation,
    status,
    taskId,
    success
  });
  
  if (!success) {
    console.log('[TRACE_NET]', `Task operation failed: ${operation} on ${taskId}, status: ${status}`);
  }
}