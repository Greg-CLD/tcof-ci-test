/**
 * Browser Console Test for Success Factor Task Persistence
 * 
 * INSTRUCTIONS:
 * 1. Log into the application in your browser
 * 2. Open the browser's JavaScript console (F12 or Ctrl+Shift+J)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 * 5. Save the console output as evidence
 */
(async function() {
  // Configuration - Works with current project or extracts from URL
  const PROJECT_ID = window.location.pathname.includes('/projects/') 
    ? window.location.pathname.split('/projects/')[1].split('/')[0]
    : '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
  
  console.log(`=== SUCCESS FACTOR TASK TOGGLE TEST ===`);
  console.log(`Project ID: ${PROJECT_ID}`);
  
  // Result collection
  const results = {
    projectId: PROJECT_ID,
    originalTasks: null,
    selectedTask: null,
    targetState: null,
    putResponse: null,
    tasksAfterToggle: null,
    taskAfterToggle: null,
    success: false,
    requests: []
  };
  
  // Step 1: Fetch all tasks with ensure=true
  console.log(`\n=== STEP 1: Fetching all tasks with ensure=true ===`);
  
  try {
    const tasksResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks?ensure=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    results.requests.push({
      url: `/api/projects/${PROJECT_ID}/tasks?ensure=true`,
      method: 'GET',
      status: tasksResponse.status
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    results.originalTasks = tasks;
    console.log(`Retrieved ${tasks.length} tasks`);
    
    // Step 2: Find Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found for this project');
    }
    
    // Step 3: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    results.selectedTask = taskToToggle;
    
    console.log(`\n=== STEP 2: Selected task to toggle ===`);
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'N/A'}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Current state: ${taskToToggle.completed ? 'Completed' : 'Not completed'}`);
    
    // Step 4: Attempt to toggle the task
    const newCompletionState = !taskToToggle.completed;
    results.targetState = newCompletionState;
    
    console.log(`\n=== STEP 3: Toggling task ===`);
    console.log(`Setting completed from ${taskToToggle.completed} to ${newCompletionState}`);
    
    const toggleResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks/${taskToToggle.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        completed: newCompletionState
      })
    });
    
    results.requests.push({
      url: `/api/projects/${PROJECT_ID}/tasks/${taskToToggle.id}`,
      method: 'PUT',
      body: { completed: newCompletionState },
      status: toggleResponse.status
    });
    
    // Check the toggle response
    console.log(`Toggle response status: ${toggleResponse.status}`);
    
    if (!toggleResponse.ok) {
      console.error(`Toggle request failed with status ${toggleResponse.status}`);
      
      try {
        const errorText = await toggleResponse.text();
        console.error(`Error response: ${errorText}`);
      } catch (e) {
        console.error('Could not read error response');
      }
      
      throw new Error(`Toggle request failed: ${toggleResponse.status}`);
    }
    
    // Parse the toggle response
    let toggleResult;
    try {
      toggleResult = await toggleResponse.json();
      results.putResponse = toggleResult;
      console.log(`Toggle response:`, toggleResult);
    } catch (e) {
      console.log(`Response is not JSON. Raw response:`);
      const text = await toggleResponse.text();
      results.putResponse = text;
      console.log(text);
    }
    
    // Step 5: Fetch tasks again to verify the toggle persisted
    console.log(`\n=== STEP 4: Verifying persistence ===`);
    
    const verifyResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    results.requests.push({
      url: `/api/projects/${PROJECT_ID}/tasks`,
      method: 'GET',
      status: verifyResponse.status
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify tasks: ${verifyResponse.status}`);
    }
    
    const tasksAfter = await verifyResponse.json();
    results.tasksAfterToggle = tasksAfter;
    
    // Find our toggled task
    const toggledTask = tasksAfter.find(t => t.id === taskToToggle.id);
    results.taskAfterToggle = toggledTask;
    
    if (!toggledTask) {
      throw new Error(`Task disappeared after toggle!`);
    }
    
    console.log(`\n=== STEP 5: Checking task after toggle ===`);
    console.log(`ID: ${toggledTask.id}`);
    console.log(`Text: ${toggledTask.text}`);
    console.log(`Source ID: ${toggledTask.sourceId || 'N/A'}`);
    console.log(`Origin: ${toggledTask.origin}`);
    console.log(`New state: ${toggledTask.completed ? 'Completed' : 'Not completed'}`);
    
    // Check if toggle was successful
    const toggleSuccessful = toggledTask.completed === newCompletionState;
    results.success = toggleSuccessful;
    
    if (toggleSuccessful) {
      console.log(`\n✅ SUCCESS: Task toggle was successful and persisted!`);
    } else {
      console.log(`\n❌ FAILURE: Task toggle did not persist!`);
      console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
    }
    
    // Final summary
    console.log(`\n=== TEST SUMMARY ===`);
    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`Task ID: ${taskToToggle.id}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'N/A'}`);
    console.log(`Original state: ${taskToToggle.completed}`);
    console.log(`Target state: ${newCompletionState}`);
    console.log(`Actual state after toggle: ${toggledTask.completed}`);
    console.log(`Success: ${toggleSuccessful}`);
    
    console.log(`\nPlease reload the page to verify the change persists after reload.`);
    
  } catch (error) {
    console.error(`Test failed:`, error);
    results.error = error.message;
  }
  
  return results;
})();