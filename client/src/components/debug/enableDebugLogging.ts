/**
 * Client-side utility to enable debug logging flags and inject them into localStorage
 * This ensures the flags are properly set before any debug operations occur
 */

/**
 * Enable all debug flags needed for task update diagnostics
 * This function sets the necessary localStorage values that DebugFlagTester reads
 */
export function enableAllTaskDebugging() {
  // Set main debug flags
  localStorage.setItem('debug_general', 'true');
  localStorage.setItem('debug_tasks', 'true');
  
  // Set task-specific debug flags
  localStorage.setItem('debug_task_api', 'true');
  localStorage.setItem('debug_task_mapping', 'true');
  localStorage.setItem('debug_task_completion', 'true');
  localStorage.setItem('debug_task_validation', 'true');
  localStorage.setItem('debug_task_persistence', 'true');
  localStorage.setItem('debug_task_state', 'true');
  
  // Log confirmation
  console.log('[DEBUG] All task debugging flags enabled');
  console.log('[DEBUG_TASKS] Task debugging is now active');
  console.log('[DEBUG_TASK_API] Task API debugging is now active');
  console.log('[DEBUG_TASK_COMPLETION] Task completion debugging is now active');
  console.log('[DEBUG_TASK_PERSISTENCE] Task persistence debugging is now active');
  console.log('[DEBUG_TASK_STATE] Task state transition debugging is now active');
  
  return true;
}

/**
 * Enable only the specific debug flags needed for SuccessFactor task diagnosis
 */
export function enableSuccessFactorDebugging() {
  // Set only the necessary flags for SuccessFactor task debugging
  localStorage.setItem('debug_general', 'true');
  localStorage.setItem('debug_tasks', 'true');
  localStorage.setItem('debug_task_api', 'true');
  localStorage.setItem('debug_task_completion', 'true');
  localStorage.setItem('debug_task_persistence', 'true');
  localStorage.setItem('debug_task_state', 'true');
  
  // Log confirmation
  console.log('[DEBUG] SuccessFactor task debugging flags enabled');
  console.log('[DEBUG_TASK_COMPLETION] SuccessFactor task completion debugging is now active');
  console.log('[DEBUG_TASK_STATE] Task state transition debugging is now active');
  
  return true;
}

/**
 * Clear all debug flags
 */
export function disableAllDebugging() {
  localStorage.setItem('debug_general', 'false');
  localStorage.setItem('debug_tasks', 'false');
  localStorage.setItem('debug_task_api', 'false');
  localStorage.setItem('debug_task_mapping', 'false');
  localStorage.setItem('debug_task_completion', 'false');
  localStorage.setItem('debug_task_validation', 'false');
  localStorage.setItem('debug_task_persistence', 'false');
  localStorage.setItem('debug_task_state', 'false');
  
  console.log('[INFO] All debug flags disabled');
  
  return true;
}

// Expose these functions to the browser console
if (typeof window !== 'undefined') {
  (window as any).enableAllTaskDebugging = enableAllTaskDebugging;
  (window as any).enableSuccessFactorDebugging = enableSuccessFactorDebugging;
  (window as any).disableAllDebugging = disableAllDebugging;
}