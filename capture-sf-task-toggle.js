/**
 * Success Factor Task Toggle Evidence Collection
 * 
 * This script runs in the browser console and collects evidence for:
 * 1. PUT request/response for toggling a Success Factor task
 * 2. GET tasks before and after toggle
 * 3. UI Task mapping with IDs and sourceIds
 * 4. Server logs for task lookup
 */
(async function() {
  const PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
  let selectedTask = null;
  let tasksBefore = null;
  let tasksAfter = null;

  // Helper for making API requests with the current session
  async function apiRequest(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`[TEST] ${method} ${endpoint}`, body || '');
    const response = await fetch(endpoint, options);
    console.log(`[TEST] Response status: ${response.status}`);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      try {
        responseData = await response.text();
      } catch (e2) {
        responseData = `Could not parse response`;
      }
    }
    
    return { status: response.status, data: responseData };
  }

  // Step 1: Get all tasks before toggle with ensure=true
  console.log('\n=== STEP 1: GET TASKS BEFORE TOGGLE ===');
  const tasksBeforeResponse = await apiRequest('GET', 
    `/api/projects/${PROJECT_ID}/tasks?ensure=true`);
  
  if (tasksBeforeResponse.status !== 200) {
    console.error(`Failed to get tasks: ${tasksBeforeResponse.status}`);
    return;
  }
  
  tasksBefore = tasksBeforeResponse.data;
  console.log(`Retrieved ${tasksBefore.length} tasks before toggle`);
  
  // Step 2: Filter for Success Factor tasks 
  const successFactorTasks = tasksBefore.filter(task => 
    task.origin === 'factor' || task.origin === 'success-factor');
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  
  if (successFactorTasks.length === 0) {
    console.error('No Success Factor tasks found. Test cannot proceed.');
    return;
  }
  
  // Step 3: Select the first Success Factor task
  selectedTask = successFactorTasks[0];
  console.log('\n=== SELECTED TASK TO TOGGLE ===');
  console.log(selectedTask);
  
  // Step 4: Toggle the task
  console.log('\n=== STEP 2: TOGGLE TASK ===');
  const newCompletionState = !selectedTask.completed;
  
  const toggleResponse = await apiRequest('PUT', 
    `/api/projects/${PROJECT_ID}/tasks/${selectedTask.id}`, 
    { completed: newCompletionState });
  
  console.log('Toggle Response:', toggleResponse);
  
  // Step 5: Get tasks after toggle
  console.log('\n=== STEP 3: GET TASKS AFTER TOGGLE ===');
  const tasksAfterResponse = await apiRequest('GET', 
    `/api/projects/${PROJECT_ID}/tasks`);
  
  if (tasksAfterResponse.status !== 200) {
    console.error(`Failed to get tasks after toggle: ${tasksAfterResponse.status}`);
    return;
  }
  
  tasksAfter = tasksAfterResponse.data;
  console.log(`Retrieved ${tasksAfter.length} tasks after toggle`);
  
  // Step 6: Find the toggled task
  const toggledTask = tasksAfter.find(task => task.id === selectedTask.id);
  
  if (!toggledTask) {
    console.error('Task disappeared after toggle!');
    return;
  }
  
  console.log('\n=== TOGGLED TASK AFTER TOGGLE ===');
  console.log(toggledTask);
  
  // Step 7: Analyze the results
  console.log('\n=== ANALYSIS ===');
  
  if (toggledTask.completed === newCompletionState) {
    console.log('✅ SUCCESS: Task toggle persisted!');
  } else {
    console.log('❌ FAILURE: Task toggle did not persist!');
    console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
  }
  
  // Step 8: Collect information for debugging
  console.log('\n=== EVIDENCE FOR DEBUGGING ===');
  console.log('1. Project ID:', PROJECT_ID);
  console.log('2. Task ID:', selectedTask.id);
  console.log('3. Source ID:', selectedTask.sourceId);
  console.log('4. Origin:', selectedTask.origin);
  console.log('5. Toggle from', selectedTask.completed, 'to', newCompletionState);
  console.log('6. Actual result:', toggledTask.completed);
  
  // Return results object for further analysis
  return {
    projectId: PROJECT_ID,
    task: selectedTask,
    toggledTask,
    success: toggledTask.completed === newCompletionState,
    tasksBefore: tasksBefore,
    tasksAfter: tasksAfter
  };
})();