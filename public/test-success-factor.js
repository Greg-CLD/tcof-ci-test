/**
 * Success Factor Task Toggle Test - Browser Based
 * 
 * This script should be run in the browser console while logged in.
 * It will:
 * 1. Get all tasks for the current project
 * 2. Find a Success Factor task
 * 3. Toggle its completion state
 * 4. Verify the update
 * 5. Refresh and verify persistence
 */

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_BASE = '/api';

// Helper to make authenticated API requests (uses browser's auth cookies)
async function apiRequest(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    console.log(`${method} ${endpoint} - Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Main test function
async function testSuccessFactorToggle() {
  console.log('=== Success Factor Task Toggle Test ===');
  console.log('Running with authenticated browser session');
  
  try {
    // Step 1: Get all tasks for the project
    console.log('\nStep 1: Getting all tasks for the current project...');
    const tasks = await apiRequest('GET', `/projects/${PROJECT_ID}/tasks`);
    console.log(`Found ${tasks.length} tasks in project`);
    
    // Step 2: Find a factor-origin task to test with
    console.log('\nStep 2: Looking for a factor-origin task to test...');
    const factorTasks = tasks.filter(task => 
      (task.origin === 'factor' || task.origin === 'success-factor')
    );
    
    if (factorTasks.length === 0) {
      console.error('No factor-origin tasks found for testing');
      return;
    }
    
    const testTask = factorTasks[0];
    console.log('\nSelected test task:');
    console.log(testTask);
    
    // Save original state for comparison
    const originalState = {
      id: testTask.id,
      text: testTask.text,
      origin: testTask.origin,
      sourceId: testTask.sourceId,
      completed: testTask.completed
    };
    
    // Log complete task data for verification
    console.log('\nORIGINAL TASK DATA:');
    console.log(JSON.stringify(testTask, null, 2));
    
    // Step 3: Toggle the task completion state
    console.log(`\nStep 3: Toggling task completion state from ${testTask.completed} to ${!testTask.completed}...`);
    const updatedTask = await apiRequest(
      'PUT',
      `/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: !testTask.completed }
    );
    
    // Log the response for verification
    console.log('\nUPDATED TASK DATA:');
    console.log(JSON.stringify(updatedTask, null, 2));
    
    // Step 4: Verify fields retained integrity
    console.log('\nStep 4: Verifying field integrity after update...');
    console.log(`ID Match: ${updatedTask.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${updatedTask.completed !== originalState.completed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${updatedTask.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${updatedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 5: Refresh the page to verify persistence
    console.log('\nStep 5: Refreshing to verify persistence...');
    console.log('Please wait while page refreshes...');
    
    // Set up data in localStorage to check after refresh
    localStorage.setItem('testTaskId', testTask.id);
    localStorage.setItem('testTaskOriginalState', JSON.stringify(originalState));
    localStorage.setItem('testInProgress', 'true');
    
    // Use setTimeout to allow console logging to complete before refresh
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Helper to check persistence after page refresh
function checkPersistenceAfterRefresh() {
  const testInProgress = localStorage.getItem('testInProgress');
  
  if (testInProgress === 'true') {
    console.log('\n=== Continuing Success Factor Task Test After Refresh ===');
    
    const testTaskId = localStorage.getItem('testTaskId');
    const originalState = JSON.parse(localStorage.getItem('testTaskOriginalState'));
    
    // Clear test data to prevent rechecking on future refreshes
    localStorage.removeItem('testInProgress');
    
    if (!testTaskId || !originalState) {
      console.error('Test data not found in localStorage');
      return;
    }
    
    console.log('\nRetrieving task data after refresh...');
    
    // Get tasks again to verify persistence
    apiRequest('GET', `/projects/${PROJECT_ID}/tasks`)
      .then(tasks => {
        const refreshedTask = tasks.find(task => task.id === testTaskId);
        
        if (!refreshedTask) {
          console.error('Test task not found after refresh');
          return;
        }
        
        console.log('\nREFRESHED TASK DATA:');
        console.log(JSON.stringify(refreshedTask, null, 2));
        
        console.log('\nVerifying persistence after refresh:');
        console.log(`ID Match: ${refreshedTask.id === originalState.id ? '✓' : '✗'}`);
        console.log(`Completion Toggled: ${refreshedTask.completed !== originalState.completed ? '✓' : '✗'}`);
        console.log(`Origin Preserved: ${refreshedTask.origin === originalState.origin ? '✓' : '✗'}`);
        console.log(`SourceId Preserved: ${refreshedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
        
        // Final result
        const testPassed = 
          refreshedTask.id === originalState.id &&
          refreshedTask.completed !== originalState.completed &&
          refreshedTask.origin === originalState.origin &&
          refreshedTask.sourceId === originalState.sourceId;
        
        console.log(`\nOverall Test Result: ${testPassed ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
        
        // Restore original state
        console.log('\nRestoring original task state...');
        apiRequest(
          'PUT',
          `/projects/${PROJECT_ID}/tasks/${testTaskId}`,
          { completed: originalState.completed }
        ).then(() => {
          console.log('Original state restored');
        }).catch(err => {
          console.error('Error restoring original state:', err);
        });
      })
      .catch(error => {
        console.error('Error fetching tasks after refresh:', error);
      });
  }
}

// Check for persistence test on page load
window.addEventListener('load', checkPersistenceAfterRefresh);

// Export functions for browser console access
window.testSuccessFactorToggle = testSuccessFactorToggle;
console.log('Success Factor task toggle test loaded! Run window.testSuccessFactorToggle() to start the test.');

// For immediate execution, uncomment:
// testSuccessFactorToggle();