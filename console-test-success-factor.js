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
  // Configuration - using the project ID from your browser session
  const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  
  console.log('=== SUCCESS FACTOR TASK PERSISTENCE TEST ===');
  console.log('Testing with authenticated browser session');
  
  try {
    // Step 1: Get all tasks for the current project
    console.log('\nSTEP 1: Retrieving all tasks for current project...');
    const tasksResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.length} tasks in the project`);
    
    // Step 2: Find a factor-origin task to test with
    console.log('\nSTEP 2: Finding a Success Factor task to test with...');
    const factorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      throw new Error('No Success Factor tasks found for testing');
    }
    
    console.log(`Found ${factorTasks.length} Success Factor tasks`);
    
    // Select the first factor task for our test
    const testTask = factorTasks[0];
    console.log('\nSelected test task:');
    console.log(JSON.stringify(testTask, null, 2));
    
    // Save original state for comparison
    const originalState = {
      id: testTask.id,
      text: testTask.text,
      origin: testTask.origin,
      sourceId: testTask.sourceId,
      completed: testTask.completed
    };
    
    // Step 3: Toggle the task's completion state
    console.log(`\nSTEP 3: Toggling task completion state from ${testTask.completed} to ${!testTask.completed}...`);
    const updateResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks/${testTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ completed: !testTask.completed }),
      credentials: 'include'
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update task: ${updateResponse.status}`);
    }
    
    // Check response headers for proper content type
    const contentType = updateResponse.headers.get('content-type');
    console.log(`Response Content-Type: ${contentType}`);
    
    const updatedTask = await updateResponse.json();
    console.log('\nUpdated task data:');
    console.log(JSON.stringify(updatedTask, null, 2));
    
    // Step 4: Verify the update was successful
    console.log('\nSTEP 4: Verifying update success...');
    console.log(`ID Match: ${updatedTask.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${updatedTask.completed !== originalState.completed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${updatedTask.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${updatedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 5: Get tasks again to verify persistence
    console.log('\nSTEP 5: Getting tasks again to verify persistence...');
    const refreshResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!refreshResponse.ok) {
      throw new Error(`Failed to refresh tasks: ${refreshResponse.status}`);
    }
    
    const refreshedTasks = await refreshResponse.json();
    const refreshedTask = refreshedTasks.find(task => task.id === testTask.id);
    
    if (!refreshedTask) {
      throw new Error('Could not find test task in refreshed task list');
    }
    
    console.log('\nRefreshed task data:');
    console.log(JSON.stringify(refreshedTask, null, 2));
    
    // Step 6: Verify persistence
    console.log('\nSTEP 6: Verifying persistence...');
    console.log(`ID Match: ${refreshedTask.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${refreshedTask.completed !== originalState.completed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${refreshedTask.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${refreshedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 7: Bonus test - Try using clean UUID format
    if (testTask.id.includes('-')) {
      console.log('\nSTEP 7: Testing with clean UUID format...');
      const parts = testTask.id.split('-');
      if (parts.length >= 5) {
        const cleanUuid = parts.slice(0, 5).join('-');
        console.log(`Using clean UUID: ${cleanUuid}`);
        
        try {
          const cleanUuidResponse = await fetch(`/api/projects/${PROJECT_ID}/tasks/${cleanUuid}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ completed: originalState.completed }), // Toggle back to original
            credentials: 'include'
          });
          
          if (!cleanUuidResponse.ok) {
            console.log(`Clean UUID test failed with status: ${cleanUuidResponse.status}`);
          } else {
            const cleanUuidResult = await cleanUuidResponse.json();
            console.log('\nClean UUID update result:');
            console.log(JSON.stringify(cleanUuidResult, null, 2));
            
            console.log('\nVerifying clean UUID update:');
            console.log(`ID Match: ${cleanUuidResult.id === originalState.id ? '✓' : '✗'}`);
            console.log(`Reset to Original: ${cleanUuidResult.completed === originalState.completed ? '✓' : '✗'}`);
            console.log(`Origin Preserved: ${cleanUuidResult.origin === originalState.origin ? '✓' : '✗'}`);
            console.log(`SourceId Preserved: ${cleanUuidResult.sourceId === originalState.sourceId ? '✓' : '✗'}`);
          }
        } catch (error) {
          console.log('Clean UUID test failed:', error);
        }
      }
    }
    
    // Test summary
    console.log('\n=== TEST RESULTS ===');
    const updateSuccess = 
      updatedTask.id === originalState.id &&
      updatedTask.completed !== originalState.completed &&
      updatedTask.origin === originalState.origin &&
      updatedTask.sourceId === originalState.sourceId;
      
    const persistenceSuccess = 
      refreshedTask.id === originalState.id &&
      refreshedTask.completed !== originalState.completed &&
      refreshedTask.origin === originalState.origin &&
      refreshedTask.sourceId === originalState.sourceId;
    
    console.log(`Initial Update: ${updateSuccess ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    console.log(`Persistence Check: ${persistenceSuccess ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    console.log(`Content-Type Check: ${contentType?.includes('application/json') ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    console.log(`\nOVERALL TEST RESULT: ${updateSuccess && persistenceSuccess ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    
    console.log('\nServer implementation that enables this functionality:');
    console.log(`
// Enhanced task lookup with special handling for Success Factor tasks
if (!validTaskId) {
  try {
    console.log(\`[TASK_LOOKUP] Attempting prefix match for \${taskId}\`);
    
    // ENHANCED: Special handling for Success Factor tasks
    // First try to find any factor-origin tasks with this UUID part
    const factorTasksQuery = await db.execute(sql\`
      SELECT * FROM project_tasks 
      WHERE (id LIKE \${idToCheck + '%'} OR source_id LIKE \${idToCheck + '%'})
      AND (origin = 'factor' OR origin = 'success-factor')
      LIMIT 1
    \`);
    
    if (factorTasksQuery.rows && factorTasksQuery.rows.length > 0) {
      validTaskId = factorTasksQuery.rows[0].id;
      lookupMethod = 'factorMatch';
      console.log(\`[TASK_LOOKUP] Found factor/success-factor task with ID/sourceId prefix \${idToCheck}, full ID: \${validTaskId}\`);
      break; // Success - exit the loop
    }
    
    // Regular prefix matching continues below...
`);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
})();