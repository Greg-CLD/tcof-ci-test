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
  const PROJECT_ID = document.location.pathname.split('/projects/')[1]?.split('/')[0] || 
    '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
  
  console.log(`=== SUCCESS FACTOR TASK PERSISTENCE TEST ===`);
  console.log(`Testing project: ${PROJECT_ID}`);
  
  let originalTasks = [];
  let taskToToggle = null;
  let toggleResult = null;
  let tasksAfterToggle = [];
  let diagnosticInfo = {};
  
  try {
    // Step 1: Intercept fetch requests to gather data
    const originalFetch = window.fetch;
    let fetchLogs = [];
    
    window.fetch = async function(url, options) {
      const startTime = Date.now();
      const method = options?.method || 'GET';
      
      if (url.includes('/api/projects/') && url.includes('/tasks')) {
        console.log(`[INTERCEPTED] ${method} ${url}`);
        if (options?.body) {
          console.log(`Request body:`, JSON.parse(options.body));
        }
      }
      
      try {
        // Call original fetch
        const response = await originalFetch(url, options);
        
        // Clone the response so we can read the body
        const clonedResponse = response.clone();
        
        if (url.includes('/api/projects/') && url.includes('/tasks')) {
          try {
            const responseData = await clonedResponse.json();
            const endTime = Date.now();
            
            // Log information about the request
            fetchLogs.push({
              url,
              method,
              requestBody: options?.body ? JSON.parse(options.body) : null,
              status: response.status,
              responseBody: responseData,
              duration: endTime - startTime
            });
            
            console.log(`[INTERCEPTED] Response status: ${response.status}`);
            if (Array.isArray(responseData)) {
              console.log(`[INTERCEPTED] Response contains ${responseData.length} tasks`);
            } else {
              console.log(`[INTERCEPTED] Response:`, responseData);
            }
          } catch (e) {
            console.log(`[INTERCEPTED] Could not parse response as JSON:`, e);
          }
        }
        
        return response;
      } catch (error) {
        console.error(`[INTERCEPTED] Fetch error:`, error);
        throw error;
      }
    };
    
    // Step 2: Get all tasks for the project
    console.log('\n=== STEP 1: GET ALL TASKS ===');
    
    try {
      const tasksResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks?ensure=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!tasksResponse.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
      }
      
      originalTasks = await tasksResponse.json();
      console.log(`Retrieved ${originalTasks.length} tasks in total`);
      
      // Find Success Factor tasks
      const successFactorTasks = originalTasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
      
      if (successFactorTasks.length === 0) {
        throw new Error('No Success Factor tasks found!');
      }
      
      // Select the first Success Factor task
      taskToToggle = successFactorTasks[0];
      
      console.log('\n=== SELECTED TASK TO TOGGLE ===');
      console.log(`ID: ${taskToToggle.id}`);
      console.log(`Text: ${taskToToggle.text}`);
      console.log(`Source ID: ${taskToToggle.sourceId || 'none'}`);
      console.log(`Origin: ${taskToToggle.origin}`);
      console.log(`Current completion: ${taskToToggle.completed}`);
      
      // Step 3: Toggle the task
      console.log('\n=== STEP 2: TOGGLE TASK ===');
      const newCompletionState = !taskToToggle.completed;
      console.log(`Toggling from ${taskToToggle.completed} to ${newCompletionState}`);
      
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
      
      if (!toggleResponse.ok) {
        throw new Error(`Toggle request failed: ${toggleResponse.status}`);
      }
      
      try {
        toggleResult = await toggleResponse.json();
        console.log('Toggle response:', toggleResult);
      } catch (e) {
        console.log(`Toggle response is not JSON. Status: ${toggleResponse.status}`);
        toggleResult = await toggleResponse.text();
      }
      
      // Step 4: Get tasks after toggle to verify persistence
      console.log('\n=== STEP 3: VERIFY PERSISTENCE ===');
      
      const afterResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!afterResponse.ok) {
        throw new Error(`Failed to fetch tasks after toggle: ${afterResponse.status}`);
      }
      
      tasksAfterToggle = await afterResponse.json();
      console.log(`Retrieved ${tasksAfterToggle.length} tasks after toggle`);
      
      // Find our toggled task
      const toggled = tasksAfterToggle.find(t => t.id === taskToToggle.id);
      
      if (!toggled) {
        throw new Error(`Task with ID ${taskToToggle.id} not found after toggle!`);
      }
      
      console.log('\n=== TASK AFTER TOGGLE ===');
      console.log(`ID: ${toggled.id}`);
      console.log(`Text: ${toggled.text}`);
      console.log(`Source ID: ${toggled.sourceId || 'none'}`);
      console.log(`Origin: ${toggled.origin}`);
      console.log(`New completion: ${toggled.completed}`);
      
      // Step 5: Verify persistence
      if (toggled.completed === newCompletionState) {
        console.log('\n✅ SUCCESS: Task toggle was successful and persisted!');
      } else {
        console.log('\n❌ FAILURE: Task toggle was not persisted!');
        console.log(`Expected: ${newCompletionState}, Actual: ${toggled.completed}`);
      }
      
      // Step 6: Reload the page and check again (real persistence test)
      console.log('\n=== STEP 4: TESTING AFTER PAGE RELOAD ===');
      console.log('To test full persistence, please reload the page and run this script again.');
      console.log('The task ID to check after reload is:', taskToToggle.id);
      
      // Save diagnostic information
      diagnosticInfo = {
        projectId: PROJECT_ID,
        taskId: taskToToggle.id,
        sourceId: taskToToggle.sourceId,
        origin: taskToToggle.origin,
        originalState: taskToToggle.completed,
        targetState: newCompletionState,
        actualState: toggled.completed,
        success: toggled.completed === newCompletionState,
        fetchLogs
      };
      
    } catch (error) {
      console.error('Error in test:', error);
    }
    
    // Restore original fetch
    window.fetch = originalFetch;
    
    return {
      success: diagnosticInfo.success,
      message: diagnosticInfo.success 
        ? 'Task toggle persisted successfully' 
        : 'Task toggle failed to persist',
      originalTask: taskToToggle,
      toggledTask: tasksAfterToggle.find(t => t.id === taskToToggle?.id),
      diagnosticInfo
    };
    
  } catch (error) {
    console.error('Test failed with error:', error);
    // Restore original fetch in case of error
    if (typeof originalFetch !== 'undefined') {
      window.fetch = originalFetch;
    }
  }
})();