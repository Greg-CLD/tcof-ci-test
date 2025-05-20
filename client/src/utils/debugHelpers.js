/**
 * Browser console debugging utilities for task updates
 * This file is deliberately using .js extension to avoid TypeScript errors
 * while providing immediate debugging capabilities
 */

// Global debug utilities will be accessed via window.debugTools
(function() {
  // Enable all debugging flags via localStorage
  function enableAllDebugging() {
    localStorage.setItem('debug_general', 'true');
    localStorage.setItem('debug_tasks', 'true');
    localStorage.setItem('debug_task_api', 'true');
    localStorage.setItem('debug_task_completion', 'true');
    localStorage.setItem('debug_task_persistence', 'true');
    localStorage.setItem('debug_task_state', 'true');
    
    console.log('[DEBUG] All debugging flags enabled');
    console.log('[DEBUG] Task debug logs will now appear in console');
    console.log('[DEBUG] Reload the page for changes to take full effect');
    
    return true;
  }
  
  // Disable all debugging flags
  function disableAllDebugging() {
    localStorage.setItem('debug_general', 'false');
    localStorage.setItem('debug_tasks', 'false');
    localStorage.setItem('debug_task_api', 'false');
    localStorage.setItem('debug_task_completion', 'false');
    localStorage.setItem('debug_task_persistence', 'false');
    localStorage.setItem('debug_task_state', 'false');
    
    console.log('[INFO] All debugging flags disabled');
    console.log('[INFO] Reload the page for changes to take effect');
    
    return true;
  }
  
  // Find all available projects
  async function findAllProjects() {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const projects = await response.json();
      console.log('[DEBUG] Found projects:', projects.length);
      
      projects.forEach((project, i) => {
        console.log(`[DEBUG] Project #${i+1}: ${project.name} (ID: ${project.id})`);
      });
      
      return projects;
    } catch (error) {
      console.error('[DEBUG] Error finding projects:', error);
      return [];
    }
  }
  
  // Find tasks for a specific project
  async function findProjectTasks(projectId) {
    if (!projectId) {
      console.error('[DEBUG] Cannot find tasks: No project ID provided');
      return [];
    }
    
    try {
      console.log(`[DEBUG] Fetching tasks for project: ${projectId}`);
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      const tasksData = await response.json();
      const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
      
      console.log(`[DEBUG] Found ${tasks.length} tasks for project ${projectId}`);
      
      // Look for SuccessFactor tasks specifically
      const successFactorTasks = tasks.filter(
        task => task.origin === 'success-factor' || task.origin === 'factor'
      );
      
      if (successFactorTasks.length > 0) {
        console.log(`[DEBUG] Found ${successFactorTasks.length} SuccessFactor tasks:`);
        successFactorTasks.forEach((task, i) => {
          console.log(`[DEBUG] SuccessFactor Task #${i+1}:`);
          console.log(`[DEBUG]   ID: ${task.id}`);
          console.log(`[DEBUG]   Text: ${task.text?.substring(0, 40)}...`);
          console.log(`[DEBUG]   Completed: ${task.completed ? 'YES' : 'NO'}`);
          console.log(`[DEBUG]   Origin: ${task.origin}`);
          console.log(`[DEBUG]   Source ID: ${task.sourceId || 'undefined'}`);
        });
      } else {
        console.log('[DEBUG] No SuccessFactor tasks found in this project');
      }
      
      return tasks;
    } catch (error) {
      console.error('[DEBUG] Error finding tasks:', error);
      return [];
    }
  }
  
  // Test toggling a task's completion state
  async function testToggleTaskCompletion(projectId, taskId) {
    if (!projectId || !taskId) {
      console.error('[DEBUG] Missing required parameters projectId or taskId');
      return { success: false, error: 'Missing required parameters' };
    }
    
    try {
      console.log(`[DEBUG] Testing task completion toggle for task ${taskId}`);
      
      // 1. Get current task state
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      const tasksData = await response.json();
      const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      
      const currentState = task.completed || false;
      const newState = !currentState;
      
      console.log('[DEBUG] Current task details:');
      console.log(`[DEBUG]   ID: ${task.id}`);
      console.log(`[DEBUG]   Text: ${task.text?.substring(0, 40)}...`);
      console.log(`[DEBUG]   Current completion: ${currentState ? 'COMPLETED' : 'NOT COMPLETED'}`);
      console.log(`[DEBUG]   Origin: ${task.origin}`);
      console.log(`[DEBUG]   Source ID: ${task.sourceId || 'undefined'}`);
      console.log(`[DEBUG] Changing completion to: ${newState ? 'COMPLETED' : 'NOT COMPLETED'}`);
      
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
      console.log('[DEBUG] Task update response:', updatedTask);
      
      // 3. Verify the update
      const verifyResponse = await fetch(`/api/projects/${projectId}/tasks`);
      if (!verifyResponse.ok) {
        throw new Error(`Failed to verify task update: ${verifyResponse.status}`);
      }
      
      const verifyTasksData = await verifyResponse.json();
      const verifyTasks = Array.isArray(verifyTasksData) ? verifyTasksData : (verifyTasksData.tasks || []);
      const verifiedTask = verifyTasks.find(t => t.id === taskId);
      
      if (!verifiedTask) {
        throw new Error('Task not found after update');
      }
      
      console.log(`[DEBUG] Verified task state: ${verifiedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
      
      if (verifiedTask.completed === newState) {
        console.log('[DEBUG] ✅ SUCCESS: Task state was correctly updated and persisted');
      } else {
        console.log('[DEBUG] ❌ FAILURE: Task state did not match expected value');
        console.log(`[DEBUG]   Expected: ${newState}, Actual: ${verifiedTask.completed}`);
      }
      
      return {
        success: verifiedTask.completed === newState,
        expected: newState,
        actual: verifiedTask.completed,
        task: verifiedTask
      };
    } catch (error) {
      console.error('[DEBUG] Error testing task completion:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Run a quick diagnostic test on the first project
  async function runQuickTest() {
    console.log('\n[DEBUG] Starting quick diagnostic test');
    console.log('[DEBUG] ===============================');
    
    // 1. Enable debugging flags
    enableAllDebugging();
    
    // 2. Find projects
    const projects = await findAllProjects();
    if (projects.length === 0) {
      console.error('[DEBUG] No projects found, cannot continue test');
      return { success: false, error: 'No projects found' };
    }
    
    const projectId = projects[0].id;
    console.log(`[DEBUG] Using project: ${projects[0].name} (${projectId})`);
    
    // 3. Find tasks
    const tasks = await findProjectTasks(projectId);
    if (tasks.length === 0) {
      console.error('[DEBUG] No tasks found, cannot continue test');
      return { success: false, error: 'No tasks found' };
    }
    
    // 4. Find a SuccessFactor task if possible
    const successFactorTask = tasks.find(t => 
      t.origin === 'success-factor' || t.origin === 'factor'
    );
    
    const testTask = successFactorTask || tasks[0];
    console.log(`[DEBUG] Selected test task: ${testTask.text?.substring(0, 30)}...`);
    
    // 5. Test toggling completion
    const result = await testToggleTaskCompletion(projectId, testTask.id);
    
    console.log('\n[DEBUG] Test complete');
    console.log(`[DEBUG] Result: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
    
    return {
      success: result.success,
      projectId,
      taskId: testTask.id,
      taskOrigin: testTask.origin,
      result
    };
  }
  
  // Export functions to global scope
  if (typeof window !== 'undefined') {
    window.debugTools = {
      enable: enableAllDebugging,
      disable: disableAllDebugging,
      findProjects: findAllProjects,
      findTasks: findProjectTasks,
      testTask: testToggleTaskCompletion,
      runTest: runQuickTest
    };
    
    console.log('[INFO] Debug tools available in console via window.debugTools');
    console.log('[INFO] Try window.debugTools.enable() to enable debug logging');
    console.log('[INFO] or window.debugTools.runTest() to test task completion');
  }
})();