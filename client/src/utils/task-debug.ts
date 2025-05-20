/**
 * Task Debug Utilities
 * 
 * This module provides browser-console utilities for debugging task updates,
 * with special focus on SuccessFactor task persistence issues.
 * 
 * Usage:
 * 1. Open browser console
 * 2. Type: window.taskDebug.enableAll()
 * 3. Reproduce the issue (e.g., mark a SuccessFactor task as complete)
 * 4. Check console logs for detailed debugging information
 */

// Enable all debug flags needed for task debugging
export function enableAllTaskDebugging() {
  // Set debug flags in localStorage
  localStorage.setItem('debug_general', 'true');
  localStorage.setItem('debug_tasks', 'true');
  localStorage.setItem('debug_task_api', 'true'); 
  localStorage.setItem('debug_task_completion', 'true');
  localStorage.setItem('debug_task_persistence', 'true');
  localStorage.setItem('debug_task_state', 'true');
  
  // Log confirmation
  console.log('[DEBUG] All task debugging flags enabled');
  console.log('[DEBUG] Task debug logs will now appear in the console');
  console.log('[DEBUG] Reload the page for changes to take full effect');
  
  return true;
}

// Special function to test a SuccessFactor task completion update
export async function testSuccessFactorTaskUpdate(projectId: string, taskId: string) {
  console.log(`[DEBUG_TASK_TEST] Testing SuccessFactor task update for task ${taskId} in project ${projectId}`);
  
  try {
    // 1. First, get current task state
    const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.status}`);
    }
    
    const task = await response.json();
    const currentState = task.completed || false;
    const newState = !currentState;
    
    console.log(`[DEBUG_TASK_TEST] Current completion state: ${currentState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`[DEBUG_TASK_TEST] Task origin: ${task.origin}`);
    console.log(`[DEBUG_TASK_TEST] Task sourceId: ${task.sourceId}`);
    console.log(`[DEBUG_TASK_TEST] Toggling to: ${newState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    // 2. Update the task
    const updateResponse = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: newState })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update task: ${updateResponse.status}`);
    }
    
    const updatedTask = await updateResponse.json();
    console.log(`[DEBUG_TASK_TEST] Task update API response:`, updatedTask);
    
    // 3. Verify the state change was persisted
    const verifyResponse = await fetch(`/api/projects/${projectId}/tasks/${taskId}`);
    const verifiedTask = await verifyResponse.json();
    
    console.log(`[DEBUG_TASK_TEST] Verification - Task state is now: ${verifiedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    if (verifiedTask.completed === newState) {
      console.log('[DEBUG_TASK_TEST] ✅ SUCCESS: Task state was correctly updated and persisted');
    } else {
      console.log('[DEBUG_TASK_TEST] ❌ FAILURE: Task state did not match expected value after update');
      console.log(`[DEBUG_TASK_TEST] Expected: ${newState}, Actual: ${verifiedTask.completed}`);
    }
    
    return {
      success: verifiedTask.completed === newState,
      originalState: currentState,
      newState: verifiedTask.completed,
      task: verifiedTask
    };
  } catch (error) {
    console.error('[DEBUG_TASK_TEST] Error testing task update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Find all SuccessFactor tasks for a project
export async function findSuccessFactorTasks(projectId: string) {
  console.log(`[DEBUG_TASK_FIND] Looking for SuccessFactor tasks in project ${projectId}`);
  
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }
    
    const tasksData = await response.json();
    const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
    
    console.log(`[DEBUG_TASK_FIND] Found ${tasks.length} tasks for project ${projectId}`);
    
    // Look specifically for SuccessFactor tasks
    const successFactorTasks = tasks.filter(
      (task: any) => task.origin === 'success-factor' || task.origin === 'factor'
    );
    
    if (successFactorTasks.length > 0) {
      console.log(`[DEBUG_TASK_FIND] Found ${successFactorTasks.length} SuccessFactor tasks`);
      successFactorTasks.forEach((task: any, index: number) => {
        console.log(`[DEBUG_TASK_FIND] SuccessFactor Task #${index + 1}:`);
        console.log(`[DEBUG_TASK_FIND]   - ID: ${task.id}`);
        console.log(`[DEBUG_TASK_FIND]   - Text: ${task.text?.substring(0, 40)}...`);
        console.log(`[DEBUG_TASK_FIND]   - Completed: ${task.completed ? 'YES' : 'NO'}`);
        console.log(`[DEBUG_TASK_FIND]   - Origin: ${task.origin}`);
        console.log(`[DEBUG_TASK_FIND]   - Source ID: ${task.sourceId}`);
      });
    } else {
      console.log('[DEBUG_TASK_FIND] No SuccessFactor tasks found in this project');
    }
    
    return successFactorTasks;
  } catch (error) {
    console.error('[DEBUG_TASK_FIND] Error finding SuccessFactor tasks:', error);
    return [];
  }
}

// Find a user's projects
export async function findUserProjects() {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const projects = await response.json();
    console.log(`[DEBUG_TASK_FIND] Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      projects.forEach((project, index) => {
        console.log(`[DEBUG_TASK_FIND] Project #${index + 1}: ${project.name} (ID: ${project.id})`);
      });
    }
    
    return projects;
  } catch (error) {
    console.error('[DEBUG_TASK_FIND] Error finding projects:', error);
    return [];
  }
}

// Disable all debug flags
export function disableAllDebugging() {
  localStorage.setItem('debug_general', 'false');
  localStorage.setItem('debug_tasks', 'false');
  localStorage.setItem('debug_task_api', 'false');
  localStorage.setItem('debug_task_completion', 'false');
  localStorage.setItem('debug_task_persistence', 'false');
  localStorage.setItem('debug_task_state', 'false');
  
  console.log('[INFO] All debug flags disabled');
  console.log('[INFO] Reload the page for changes to take full effect');
  
  return true;
}

// Run a complete diagnostic test
export async function runCompleteDiagnostic() {
  console.log('\n[DEBUG_TASK_DIAG] Starting complete task diagnostic');
  console.log('[DEBUG_TASK_DIAG] ====================================');
  
  // Step 1: Enable debugging flags
  enableAllTaskDebugging();
  
  // Step 2: Get user projects
  const projects = await findUserProjects();
  
  if (projects.length === 0) {
    console.error('[DEBUG_TASK_DIAG] No projects found, cannot continue');
    return { success: false, error: 'No projects found' };
  }
  
  // Step 3: Find SuccessFactor tasks in the first project
  const projectId = projects[0].id;
  console.log(`[DEBUG_TASK_DIAG] Using project: ${projects[0].name} (${projectId})`);
  
  const successFactorTasks = await findSuccessFactorTasks(projectId);
  
  if (successFactorTasks.length === 0) {
    console.log('[DEBUG_TASK_DIAG] No SuccessFactor tasks found in this project');
    console.log('[DEBUG_TASK_DIAG] Testing with regular tasks instead');
    
    // Get all tasks
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    const tasksData = await response.json();
    const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
    
    if (tasks.length === 0) {
      console.error('[DEBUG_TASK_DIAG] No tasks found for selected project');
      return { success: false, error: 'No tasks found' };
    }
    
    // Use the first available task
    const testTask = tasks[0];
    console.log(`[DEBUG_TASK_DIAG] Testing with regular task: ${testTask.text?.substring(0, 30)}...`);
    
    // Run the test
    const result = await testSuccessFactorTaskUpdate(projectId, testTask.id);
    return {
      success: result.success,
      projectId,
      taskId: testTask.id,
      taskOrigin: testTask.origin,
      results: result
    };
  }
  
  // Step 4: Test the first SuccessFactor task
  const targetTask = successFactorTasks[0];
  console.log(`[DEBUG_TASK_DIAG] Testing with SuccessFactor task: ${targetTask.text?.substring(0, 30)}...`);
  
  const result = await testSuccessFactorTaskUpdate(projectId, targetTask.id);
  
  console.log('\n[DEBUG_TASK_DIAG] Diagnostic complete');
  console.log('[DEBUG_TASK_DIAG] ===================');
  console.log(`[DEBUG_TASK_DIAG] Result: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
  
  return {
    success: result.success,
    projectId,
    taskId: targetTask.id,
    taskOrigin: targetTask.origin,
    results: result
  };
}

// Export to browser global for console access
if (typeof window !== 'undefined') {
  // Create global namespace if it doesn't exist
  (window as any).taskDebug = {
    enableAll: enableAllTaskDebugging,
    disableAll: disableAllDebugging,
    findProjects: findUserProjects,
    findSuccessFactorTasks,
    testTaskUpdate: testSuccessFactorTaskUpdate,
    runDiagnostic: runCompleteDiagnostic
  };
}

export {
  enableAllTaskDebugging,
  disableAllDebugging,
  findUserProjects,
  findSuccessFactorTasks,
  testSuccessFactorTaskUpdate,
  runCompleteDiagnostic
};