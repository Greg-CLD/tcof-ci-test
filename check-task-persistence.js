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

(async function runTest() {
  // Configuration - adjust project ID as needed
  const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  const API_BASE = '/api';

  console.log('=== Success Factor Task Toggle Persistence Test ===');
  console.log('Testing with your authenticated browser session');
  
  // Function to make authenticated API requests
  async function apiRequest(method, endpoint, body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include' // Important: this sends cookies with the request
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      console.log(`API ${method} ${endpoint}${body ? ' with body:' : ''}`);
      if (body) console.log(JSON.stringify(body, null, 2));
      
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      console.log(`Response Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
  
  try {
    // STEP 1: Get all tasks for the project
    console.log('\n--- STEP 1: Getting all tasks for the current project ---');
    const allTasks = await apiRequest('GET', `/projects/${PROJECT_ID}/tasks`);
    
    if (!allTasks || !Array.isArray(allTasks)) {
      throw new Error('Failed to fetch tasks or response is not an array');
    }
    
    console.log(`Found ${allTasks.length} tasks in the project`);
    
    // STEP 2: Find Success Factor tasks
    console.log('\n--- STEP 2: Finding Success Factor tasks ---');
    const factorTasks = allTasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      throw new Error('No Success Factor tasks found for testing');
    }
    
    console.log(`Found ${factorTasks.length} Success Factor tasks`);
    
    // Log all Success Factor task IDs for debugging
    console.log('\nAll Success Factor tasks:');
    factorTasks.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id}, Text: ${task.text}, Completed: ${task.completed}, Origin: ${task.origin}, SourceId: ${task.sourceId}`);
    });
    
    // Select the first factor task for testing
    const testTask = factorTasks[0];
    
    // Log complete task data
    console.log('\nSelected test task BEFORE toggle:');
    console.log(JSON.stringify(testTask, null, 2));
    
    // Save original state for comparison
    const originalState = {
      id: testTask.id,
      text: testTask.text,
      origin: testTask.origin,
      sourceId: testTask.sourceId,
      completed: testTask.completed
    };
    
    // STEP 3: Toggle the task completion state
    console.log(`\n--- STEP 3: Toggling completion state from ${testTask.completed} to ${!testTask.completed} ---`);
    const updatedTask = await apiRequest(
      'PUT',
      `/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: !testTask.completed }
    );
    
    // Log the updated task data
    console.log('\nSelected test task AFTER toggle:');
    console.log(JSON.stringify(updatedTask, null, 2));
    
    // STEP 4: Verify fields maintained integrity
    console.log('\n--- STEP 4: Verifying field integrity after update ---');
    const idMatch = updatedTask.id === originalState.id;
    const completionToggled = updatedTask.completed !== originalState.completed;
    const originPreserved = updatedTask.origin === originalState.origin;
    const sourceIdPreserved = updatedTask.sourceId === originalState.sourceId;
    
    console.log(`ID Match: ${idMatch ? '✓' : '✗'} (${updatedTask.id})`);
    console.log(`Completion Toggled: ${completionToggled ? '✓' : '✗'} (${originalState.completed} → ${updatedTask.completed})`);
    console.log(`Origin Preserved: ${originPreserved ? '✓' : '✗'} (${updatedTask.origin})`);
    console.log(`SourceId Preserved: ${sourceIdPreserved ? '✓' : '✗'} (${updatedTask.sourceId})`);
    
    // STEP 5: Get all tasks again to verify persistence
    console.log('\n--- STEP 5: Getting all tasks again to verify persistence ---');
    const refreshedTasks = await apiRequest('GET', `/projects/${PROJECT_ID}/tasks`);
    
    if (!refreshedTasks || !Array.isArray(refreshedTasks)) {
      throw new Error('Failed to fetch refreshed tasks');
    }
    
    const refreshedTask = refreshedTasks.find(task => task.id === testTask.id);
    
    if (!refreshedTask) {
      throw new Error('Could not find the test task in the refreshed task list');
    }
    
    console.log('\nRefreshed task data:');
    console.log(JSON.stringify(refreshedTask, null, 2));
    
    // STEP 6: Verify persistence after refresh
    console.log('\n--- STEP 6: Verifying persistence after refresh ---');
    const idMatchAfterRefresh = refreshedTask.id === originalState.id;
    const completionToggledAfterRefresh = refreshedTask.completed !== originalState.completed;
    const originPreservedAfterRefresh = refreshedTask.origin === originalState.origin;
    const sourceIdPreservedAfterRefresh = refreshedTask.sourceId === originalState.sourceId;
    
    console.log(`ID Match: ${idMatchAfterRefresh ? '✓' : '✗'} (${refreshedTask.id})`);
    console.log(`Completion Toggled: ${completionToggledAfterRefresh ? '✓' : '✗'} (${originalState.completed} → ${refreshedTask.completed})`);
    console.log(`Origin Preserved: ${originPreservedAfterRefresh ? '✓' : '✗'} (${refreshedTask.origin})`);
    console.log(`SourceId Preserved: ${sourceIdPreservedAfterRefresh ? '✓' : '✗'} (${refreshedTask.sourceId})`);
    
    // STEP 7: Try with clean UUID (standard format without suffix)
    console.log('\n--- STEP 7: Testing with clean UUID format ---');
    let cleanUuid = null;
    
    if (testTask.id.includes('-')) {
      const parts = testTask.id.split('-');
      if (parts.length > 5) {
        // Extract standard UUID part (first 5 segments)
        cleanUuid = parts.slice(0, 5).join('-');
        console.log(`Clean UUID format: ${cleanUuid}`);
        
        // Attempt to update using the clean UUID
        console.log('\nAttempting update with clean UUID...');
        try {
          const cleanUuidUpdate = await apiRequest(
            'PUT',
            `/projects/${PROJECT_ID}/tasks/${cleanUuid}`,
            { completed: originalState.completed }  // Toggle back to original state
          );
          
          console.log('\nTask data after clean UUID update:');
          console.log(JSON.stringify(cleanUuidUpdate, null, 2));
          
          // Verify clean UUID update
          console.log('\nVerifying clean UUID update:');
          console.log(`ID Match: ${cleanUuidUpdate.id === testTask.id ? '✓' : '✗'} (${cleanUuidUpdate.id})`);
          console.log(`Completion Reset: ${cleanUuidUpdate.completed === originalState.completed ? '✓' : '✗'} (${cleanUuidUpdate.completed})`);
          console.log(`Origin Preserved: ${cleanUuidUpdate.origin === originalState.origin ? '✓' : '✗'} (${cleanUuidUpdate.origin})`);
          console.log(`SourceId Preserved: ${cleanUuidUpdate.sourceId === originalState.sourceId ? '✓' : '✗'} (${cleanUuidUpdate.sourceId})`);
        } catch (error) {
          console.error('Clean UUID update failed:', error);
          console.log('Note: If the server uses exact ID matching only, this error is expected');
        }
      } else {
        console.log('Task ID does not have a suffix, skipping clean UUID test');
      }
    } else {
      console.log('Task ID does not contain hyphens, skipping clean UUID test');
    }
    
    // STEP 8: Final verification after all tests
    console.log('\n--- STEP 8: Final verification ---');
    const finalTasks = await apiRequest('GET', `/projects/${PROJECT_ID}/tasks`);
    const finalTask = finalTasks.find(task => task.id === testTask.id);
    
    if (!finalTask) {
      throw new Error('Could not find the test task in the final task list');
    }
    
    console.log('\nFinal task state:');
    console.log(JSON.stringify(finalTask, null, 2));
    
    // Test results summary
    console.log('\n=== TEST RESULTS SUMMARY ===');
    const testPassed = 
      idMatch && 
      completionToggled && 
      originPreserved && 
      sourceIdPreserved &&
      idMatchAfterRefresh && 
      completionToggledAfterRefresh && 
      originPreservedAfterRefresh && 
      sourceIdPreservedAfterRefresh;
    
    console.log(`\nToggle Success: ${(idMatch && completionToggled && originPreserved && sourceIdPreserved) ? '✓' : '✗'}`);
    console.log(`Persistence Verified: ${(idMatchAfterRefresh && completionToggledAfterRefresh && originPreservedAfterRefresh && sourceIdPreservedAfterRefresh) ? '✓' : '✗'}`);
    console.log(`Clean UUID Support: ${cleanUuid ? 'Tested' : 'Skipped'}`);
    
    console.log(`\nOVERALL TEST RESULT: ${testPassed ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    
  } catch (error) {
    console.error('\nTest failed with error:', error);
  }
  
  console.log('\nTest completed. Please save these results.');
})();