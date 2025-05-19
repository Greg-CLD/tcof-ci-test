/**
 * Utility to help debug task state transitions by toggling the state of a task
 * and enabling DEBUG_TASK_STATE flag
 */

// Enable debug mode in localStorage
const enableTaskStateDebugging = () => {
  localStorage.setItem('debug_task_state', 'true');
  console.log('[DEBUG] Task state transition debugging enabled');
  console.log('[DEBUG] Debug logs will be visible in server console');
};

// Toggle a task's completion state via the API
const toggleTaskState = async (projectId: string, taskId: string) => {
  try {
    console.log(`[DEBUG] Toggling task state for task ${taskId} in project ${projectId}`);
    
    // First, get current task state
    const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.status}`);
    }
    
    const task = await response.json();
    const currentState = task.completed || false;
    const newState = !currentState;
    
    console.log(`[DEBUG] Current completion state: ${currentState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`[DEBUG] Toggling to: ${newState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    // Update the task
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
    console.log(`[DEBUG] Task update API response:`, updatedTask);
    
    // Verify the state change was persisted
    const verifyResponse = await fetch(`/api/projects/${projectId}/tasks/${taskId}`);
    const verifiedTask = await verifyResponse.json();
    
    console.log(`[DEBUG] Verification - Task state is now: ${verifiedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    if (verifiedTask.completed === newState) {
      console.log('[DEBUG] ✅ SUCCESS: Task state was correctly updated and persisted');
    } else {
      console.log('[DEBUG] ❌ FAILURE: Task state did not match expected value after update');
      console.log(`[DEBUG] Expected: ${newState}, Actual: ${verifiedTask.completed}`);
    }
    
    return {
      success: verifiedTask.completed === newState,
      originalState: currentState,
      newState: verifiedTask.completed,
      task: verifiedTask
    };
  } catch (error) {
    console.error('[DEBUG] Error toggling task state:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Find all tasks for a project
const getProjectTasks = async (projectId: string) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }
    
    const tasksData = await response.json();
    const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
    
    console.log(`[DEBUG] Found ${tasks.length} tasks for project ${projectId}`);
    
    // Look specifically for SuccessFactor tasks
    const successFactorTasks = tasks.filter(
      task => task.origin === 'success-factor' || task.origin === 'factor'
    );
    
    if (successFactorTasks.length > 0) {
      console.log(`[DEBUG] Found ${successFactorTasks.length} SuccessFactor tasks`);
      successFactorTasks.slice(0, 5).forEach((task, index) => {
        console.log(`[DEBUG] SuccessFactor Task #${index + 1}:`);
        console.log(`[DEBUG]   - ID: ${task.id}`);
        console.log(`[DEBUG]   - Text: ${task.text?.substring(0, 40)}...`);
        console.log(`[DEBUG]   - Completed: ${task.completed ? 'YES' : 'NO'}`);
        console.log(`[DEBUG]   - Origin: ${task.origin}`);
        console.log(`[DEBUG]   - Source ID: ${task.sourceId}`);
      });
    }
    
    return tasks;
  } catch (error) {
    console.error('[DEBUG] Error fetching project tasks:', error);
    return [];
  }
};

// Find a user's projects
const getUserProjects = async () => {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const projects = await response.json();
    console.log(`[DEBUG] Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      projects.forEach((project, index) => {
        console.log(`[DEBUG] Project #${index + 1}: ${project.name} (ID: ${project.id})`);
      });
    }
    
    return projects;
  } catch (error) {
    console.error('[DEBUG] Error fetching projects:', error);
    return [];
  }
};

// Run a full diagnostics session for task state transitions
const runDebugSession = async () => {
  console.log('\n[DEBUG] Starting task state transition debug session');
  console.log('[DEBUG] =============================================');
  
  // Step 1: Enable debugging flags
  enableTaskStateDebugging();
  
  // Step 2: Get user projects
  const projects = await getUserProjects();
  
  if (projects.length === 0) {
    console.error('[DEBUG] No projects found, cannot continue');
    return { success: false, error: 'No projects found' };
  }
  
  // Step 3: Get project tasks for the first project
  const projectId = projects[0].id;
  console.log(`[DEBUG] Using project: ${projects[0].name} (${projectId})`);
  
  const tasks = await getProjectTasks(projectId);
  
  if (tasks.length === 0) {
    console.error('[DEBUG] No tasks found for selected project');
    return { success: false, error: 'No tasks found' };
  }
  
  // Step 4: Find a suitable task for testing
  const successFactorTask = tasks.find(
    task => task.origin === 'success-factor' || task.origin === 'factor'
  );
  
  const targetTask = successFactorTask || tasks[0];
  console.log(`[DEBUG] Selected task for testing: ${targetTask.text?.substring(0, 30)}...`);
  console.log(`[DEBUG] Task origin: ${targetTask.origin}`);
  console.log(`[DEBUG] Task ID: ${targetTask.id}`);
  
  // Step 5: Toggle task state
  console.log('[DEBUG] Toggling task state...');
  const result = await toggleTaskState(projectId, targetTask.id);
  
  console.log('\n[DEBUG] Debug session completed');
  console.log('[DEBUG] ======================');
  console.log(`[DEBUG] Result: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
  
  return {
    success: result.success,
    projectId,
    taskId: targetTask.id,
    taskOrigin: targetTask.origin,
    details: result
  };
};

// Export for browser console access
(window as any).debugTaskState = {
  enable: enableTaskStateDebugging,
  getProjects: getUserProjects,
  getTasks: getProjectTasks,
  toggleTask: toggleTaskState,
  runSession: runDebugSession
};

export {
  enableTaskStateDebugging,
  toggleTaskState,
  getProjectTasks,
  getUserProjects,
  runDebugSession
};