/**
 * Success Factor Task Persistence Test
 * 
 * This script:
 * 1. Captures all tasks shown in the UI
 * 2. Attempts to toggle a Success Factor task
 * 3. Monitors the network requests/responses
 * 4. Verifies the task state change is persisted
 * 
 * Instructions:
 * 1. Copy and paste the entire script into your browser console
 * 2. Press Enter to run the test
 * 3. Watch the console for detailed logs and results
 */

(async function() {
  console.log('=== SUCCESS FACTOR TASK PERSISTENCE TEST ===');
  const testStartTime = new Date().toISOString();
  console.log(`Test started at: ${testStartTime}`);
  console.log('This test validates our fix for the project/task ID mismatch issue');
  
  // Get current project ID from localStorage
  const currentProjectId = localStorage.getItem('currentProjectId');
  if (!currentProjectId) {
    console.error('❌ No project ID found in localStorage. Please navigate to a project first.');
    return;
  }
  
  console.log(`✅ Current project context: ${currentProjectId}`);
  
  // First, let's capture all the tasks currently visible in the UI
  const taskElements = document.querySelectorAll('[data-task-id]');
  console.log(`Found ${taskElements.length} task elements in the UI`);
  
  // Map task elements to their data
  const uiTasks = Array.from(taskElements).map(el => {
    const taskId = el.getAttribute('data-task-id');
    const sourceId = el.getAttribute('data-source-id') || null;
    const isCompleted = el.querySelector('input[type="checkbox"]')?.checked || false;
    const taskText = el.querySelector('.task-text')?.textContent || '';
    const origin = el.getAttribute('data-origin') || null;
    
    return {
      id: taskId,
      sourceId,
      text: taskText,
      completed: isCompleted,
      origin
    };
  });
  
  // Log all tasks found in the UI
  console.log('Tasks in UI:', uiTasks);
  
  // Find a success factor task to toggle (preferably one that's not completed)
  const factorTasks = uiTasks.filter(task => 
    task.origin === 'factor' || task.sourceId
  );
  
  if (factorTasks.length === 0) {
    console.error('❌ No Success Factor tasks found in the UI. Test cannot continue.');
    return;
  }
  
  console.log(`✅ Found ${factorTasks.length} Success Factor tasks in the UI`);
  
  // Select a task to toggle - preferably not completed
  const taskToToggle = factorTasks.find(task => !task.completed) || factorTasks[0];
  console.log('Selected task to toggle:', taskToToggle);
  
  // Get current task state from the API for comparison
  async function getTasksFromApi() {
    try {
      console.log(`Fetching tasks for project ${currentProjectId} from API...`);
      const response = await fetch(`/api/projects/${currentProjectId}/tasks`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const tasks = await response.json();
      console.log(`✅ API returned ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching tasks from API:', error);
      return [];
    }
  }
  
  // Helper function to make authenticated API requests
  async function apiRequest(method, endpoint, body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      };
      
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      
      console.log(`Making ${method} request to ${endpoint}`);
      if (body) console.log('Request body:', body);
      
      const response = await fetch(endpoint, options);
      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { text, contentType };
      }
      
      return {
        ok: response.ok,
        status: response.status,
        data: responseData,
        headers: Object.fromEntries([...response.headers.entries()])
      };
    } catch (error) {
      console.error(`API request error (${method} ${endpoint}):`, error);
      return {
        ok: false,
        status: -1,
        error: error.message
      };
    }
  }
  
  // Get tasks from API before toggle
  const tasksBeforeToggle = await getTasksFromApi();
  const apiTaskBeforeToggle = tasksBeforeToggle.find(task => task.id === taskToToggle.id);
  
  if (!apiTaskBeforeToggle) {
    console.error(`❌ Task with ID ${taskToToggle.id} not found in API response`);
    return;
  }
  
  console.log('Task state before toggle (from API):', apiTaskBeforeToggle);
  
  // Test project mismatch protection by attempting cross-project task update
  console.log('=== CROSS-PROJECT UPDATE TEST ===');
  console.log('Testing project mismatch protection by attempting to update task from wrong project context...');
  
  // Find another project ID (different from current)
  const otherProjectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Using a known project ID
  console.log(`Using alternative project context: ${otherProjectId}`);
  
  // Attempt to update the task from the wrong project context
  const mismatchResponse = await apiRequest(
    'PUT',
    `/api/projects/${otherProjectId}/tasks/${taskToToggle.id}`,
    {
      completed: !apiTaskBeforeToggle.completed,
      origin: apiTaskBeforeToggle.origin,
      sourceId: apiTaskBeforeToggle.sourceId,
      status: !apiTaskBeforeToggle.completed ? 'Done' : 'To Do'
    }
  );
  
  console.log('Cross-project update response:', mismatchResponse);
  
  // Verify mismatch protection worked
  if (mismatchResponse.status === 403 || mismatchResponse.status === 404) {
    console.log('✅ Project mismatch protection worked! Update was properly blocked.');
    
    if (mismatchResponse.data && mismatchResponse.data.error === 'PROJECT_TASK_MISMATCH') {
      console.log('✅ Correct error code returned: PROJECT_TASK_MISMATCH');
    }
  } else {
    console.log('❌ Project mismatch protection FAILED! Update was not blocked as expected.');
  }
  
  // Now test legitimate update
  console.log('\n=== LEGITIMATE UPDATE TEST ===');
  console.log('Testing legitimate task update within correct project context...');
  
  // Toggle the task correctly using the proper project context
  const updateResponse = await apiRequest(
    'PUT',
    `/api/projects/${currentProjectId}/tasks/${taskToToggle.id}`,
    {
      completed: !apiTaskBeforeToggle.completed,
      origin: apiTaskBeforeToggle.origin,
      sourceId: apiTaskBeforeToggle.sourceId,
      status: !apiTaskBeforeToggle.completed ? 'Done' : 'To Do',
      projectId: currentProjectId
    }
  );
  
  console.log('Legitimate update response:', updateResponse);
  
  // Verify legitimate update worked
  if (updateResponse.ok) {
    console.log('✅ Legitimate update succeeded as expected!');
  } else {
    console.log('❌ Legitimate update failed unexpectedly.');
  }
  
  // Get tasks from API after toggle to verify persistence
  const tasksAfterToggle = await getTasksFromApi();
  const apiTaskAfterToggle = tasksAfterToggle.find(task => task.id === taskToToggle.id);
  
  if (!apiTaskAfterToggle) {
    console.error(`❌ Task with ID ${taskToToggle.id} not found in API after toggle`);
    return;
  }
  
  console.log('Task state after toggle (from API):', apiTaskAfterToggle);
  
  // Verify the completion state was properly toggled and persisted
  if (apiTaskAfterToggle.completed !== apiTaskBeforeToggle.completed) {
    console.log('✅ Task completion state was successfully toggled and persisted!');
  } else {
    console.log('❌ Task completion state was NOT properly toggled or persisted.');
  }
  
  // Verify sourceId preservation
  if (apiTaskAfterToggle.sourceId === apiTaskBeforeToggle.sourceId) {
    console.log('✅ sourceId was preserved as expected!');
  } else {
    console.log('❌ sourceId was NOT preserved.');
    console.log(`  - Before: ${apiTaskBeforeToggle.sourceId}`);
    console.log(`  - After:  ${apiTaskAfterToggle.sourceId}`);
  }
  
  // Verify origin preservation
  if (apiTaskAfterToggle.origin === apiTaskBeforeToggle.origin) {
    console.log('✅ origin was preserved as expected!');
  } else {
    console.log('❌ origin was NOT preserved.');
    console.log(`  - Before: ${apiTaskBeforeToggle.origin}`);
    console.log(`  - After:  ${apiTaskAfterToggle.origin}`);
  }
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Test started at: ${testStartTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
  console.log('Results:');
  console.log(`- Project mismatch protection: ${mismatchResponse.status === 403 || mismatchResponse.status === 404 ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`- Legitimate update: ${updateResponse.ok ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`- Completion state toggled: ${apiTaskAfterToggle.completed !== apiTaskBeforeToggle.completed ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`- sourceId preserved: ${apiTaskAfterToggle.sourceId === apiTaskBeforeToggle.sourceId ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`- origin preserved: ${apiTaskAfterToggle.origin === apiTaskBeforeToggle.origin ? 'PASS ✅' : 'FAIL ❌'}`);
  
  const overallSuccess = 
    (mismatchResponse.status === 403 || mismatchResponse.status === 404) &&
    updateResponse.ok &&
    apiTaskAfterToggle.completed !== apiTaskBeforeToggle.completed &&
    apiTaskAfterToggle.sourceId === apiTaskBeforeToggle.sourceId &&
    apiTaskAfterToggle.origin === apiTaskBeforeToggle.origin;
  
  console.log(`\nOVERALL TEST: ${overallSuccess ? 'PASS ✅' : 'FAIL ❌'}`);
  
})();