/**
 * Success Factor Task Toggle Persistence Test
 * 
 * INSTRUCTIONS:
 * 1. While logged in to the application, open your browser's JavaScript console
 * 2. Copy and paste this entire script into the console
 * 3. Press Enter to run the test
 * 4. The script will automatically log all test steps and results
 * 
 * This test will:
 * - Get all tasks for the current project
 * - Find Success Factor tasks
 * - Toggle a task's completion state
 * - Verify the toggle worked and metadata was preserved
 * - Refresh the page to verify persistence
 */

(async function() {
  // Configuration - Use current project or fall back to a known test project
  const PROJECT_ID = window.location.pathname.includes('/projects/') 
    ? window.location.pathname.split('/projects/')[1]?.split('/')[0] 
    : '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
  
  console.log(`=== SUCCESS FACTOR TASK TOGGLE PERSISTENCE TEST ===`);
  console.log(`Project ID: ${PROJECT_ID}`);
  
  // Helper for making API requests
  async function apiRequest(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include' // Include cookies for authentication
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`${method} ${endpoint}`, body || '');
    
    try {
      const response = await fetch(endpoint, options);
      
      console.log(`Response status: ${response.status}`);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }
      
      return {
        status: response.status,
        ok: response.ok,
        data
      };
    } catch (error) {
      console.error('Request failed:', error);
      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }
  
  try {
    // STEP 1: Get all tasks with ensure=true
    console.log('\n=== STEP 1: GET TASKS WITH ensure=true ===');
    
    const tasksResponse = await apiRequest(
      'GET',
      `/api/projects/${PROJECT_ID}/tasks?ensure=true`
    );
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to get tasks: ${tasksResponse.status}`);
    }
    
    const tasks = tasksResponse.data;
    console.log(`Retrieved ${tasks.length} tasks in total`);
    
    // STEP 2: Find Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found. Test cannot proceed.');
    }
    
    // STEP 3: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    
    console.log('\n=== SELECTED TASK TO TOGGLE ===');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'N/A'}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // STEP 4: Toggle the task
    const newCompletionState = !taskToToggle.completed;
    console.log(`\n=== STEP 2: TOGGLING TASK TO ${newCompletionState} ===`);
    
    const toggleResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${taskToToggle.id}`,
      { completed: newCompletionState }
    );
    
    if (!toggleResponse.ok) {
      throw new Error(`Failed to toggle task: ${toggleResponse.status}`);
    }
    
    console.log('Toggle response:', toggleResponse.data);
    
    // STEP 5: Get tasks again to verify the toggle
    console.log('\n=== STEP 3: VERIFYING TOGGLE IN API ===');
    
    const tasksAfterResponse = await apiRequest(
      'GET',
      `/api/projects/${PROJECT_ID}/tasks`
    );
    
    if (!tasksAfterResponse.ok) {
      throw new Error(`Failed to get tasks after toggle: ${tasksAfterResponse.status}`);
    }
    
    const tasksAfter = tasksAfterResponse.data;
    console.log(`Retrieved ${tasksAfter.length} tasks after toggle`);
    
    // Find the toggled task
    const toggledTask = tasksAfter.find(task => task.id === taskToToggle.id);
    
    if (!toggledTask) {
      throw new Error(`Task ${taskToToggle.id} disappeared after toggle!`);
    }
    
    console.log('\n=== TOGGLED TASK (API) ===');
    console.log(`ID: ${toggledTask.id}`);
    console.log(`Text: ${toggledTask.text}`);
    console.log(`Origin: ${toggledTask.origin}`);
    console.log(`Source ID: ${toggledTask.sourceId || 'N/A'}`);
    console.log(`New completion state: ${toggledTask.completed}`);
    
    // Check if toggle was successful
    const apiToggleSuccessful = toggledTask.completed === newCompletionState;
    
    if (apiToggleSuccessful) {
      console.log('\n✅ SUCCESS: Task toggle worked in API response');
    } else {
      console.log('\n❌ FAILURE: Task toggle not reflected in API response');
      console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
    }
    
    // STEP 6: Reload the page to verify persistence
    console.log('\n=== STEP 4: RELOADING PAGE TO VERIFY PERSISTENCE ===');
    
    // Before reloading, save task info to localStorage for comparison after reload
    const taskBeforeReload = {
      id: toggledTask.id,
      completed: toggledTask.completed,
      projectId: PROJECT_ID,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('sf_task_toggle_test', JSON.stringify(taskBeforeReload));
    
    console.log('Task state saved to localStorage. Reloading page...');
    console.log('Please run verification part (provided separately) after reload');
    
    // Wait a moment before reloading to ensure the message is shown
    setTimeout(() => {
      location.reload();
    }, 2000);
    
    return {
      success: apiToggleSuccessful,
      taskId: taskToToggle.id,
      originalState: taskToToggle.completed,
      newState: newCompletionState,
      actualState: toggledTask.completed
    };
    
  } catch (error) {
    console.error('Test failed:', error.message);
    return { error: error.message };
  }
})()