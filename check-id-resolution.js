/**
 * Task ID Resolution Test Script
 * 
 * This script tests if the root cause is a task ID resolution issue:
 * 1. Checks if Success Factor tasks are properly created in the database
 * 2. Verifies if task IDs are correctly resolved during the update process
 * 3. Tests if source_id is being used correctly for task lookup
 * 
 * Run in browser console while on a project's checklist page
 */

(async function() {
  console.log('=== TASK ID RESOLUTION DIAGNOSTIC TEST ===');
  
  // Get project ID from current URL
  const PROJECT_ID = window.location.pathname.includes('/projects/') 
    ? window.location.pathname.split('/projects/')[1]?.split('/')[0] 
    : null;
  
  if (!PROJECT_ID) {
    console.error('❌ ERROR: Not on a project page. Please navigate to a project checklist.');
    return;
  }
  
  console.log(`Project ID: ${PROJECT_ID}`);
  
  // Helper for making API requests
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
    
    console.log(`${method} ${endpoint}`, body || '');
    
    try {
      const response = await fetch(endpoint, options);
      
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
    // TEST 1: Check if API can load tasks with ensure=true
    console.log('\n=== TEST 1: TASKS API WITH ensure=true ===');
    
    const ensureTasks = await apiRequest(
      'GET',
      `/api/projects/${PROJECT_ID}/tasks?ensure=true`
    );
    
    if (!ensureTasks.ok) {
      console.error(`❌ FAILED: Tasks API with ensure=true returned ${ensureTasks.status}`);
      throw new Error(`API error: ${ensureTasks.status}`);
    }
    
    console.log(`✅ SUCCESS: Retrieved ${ensureTasks.data.length} tasks with ensure=true`);
    
    // Check for Success Factor tasks
    const successFactors = ensureTasks.data.filter(t => 
      t.origin === 'factor' || t.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactors.length} Success Factor tasks`);
    
    if (successFactors.length === 0) {
      console.error('❌ WARNING: No Success Factor tasks found with ensure=true');
      return;
    }
    
    // TEST 2: Verify if tasks exist without ensure
    console.log('\n=== TEST 2: TASKS API WITHOUT ensure ===');
    
    const regularTasks = await apiRequest(
      'GET',
      `/api/projects/${PROJECT_ID}/tasks`
    );
    
    if (!regularTasks.ok) {
      console.error(`❌ FAILED: Tasks API without ensure returned ${regularTasks.status}`);
      throw new Error(`API error: ${regularTasks.status}`);
    }
    
    console.log(`Retrieved ${regularTasks.data.length} tasks without ensure`);
    
    // Check if all Success Factor tasks from ensure=true exist in regular tasks
    let missingTasks = 0;
    
    for (const task of successFactors) {
      const exists = regularTasks.data.some(t => t.id === task.id);
      if (!exists) {
        missingTasks++;
        console.log(`Missing task: ${task.id} (${task.text})`);
      }
    }
    
    if (missingTasks > 0) {
      console.log(`❌ FOUND ISSUE: ${missingTasks} Success Factor tasks exist with ensure=true but not in regular API call`);
      console.log('This indicates tasks are not being properly created in the database');
    } else {
      console.log('✅ SUCCESS: All Success Factor tasks exist in both API calls');
    }
    
    // TEST 3: Verify source_id uniqueness
    console.log('\n=== TEST 3: SOURCE ID UNIQUENESS ===');
    
    const sourceIdMap = new Map();
    let duplicateSourceIds = 0;
    
    for (const task of ensureTasks.data) {
      if (!task.sourceId) continue;
      
      if (sourceIdMap.has(task.sourceId)) {
        duplicateSourceIds++;
        console.log(`Duplicate source_id: ${task.sourceId}`);
        console.log(`  1. ID: ${sourceIdMap.get(task.sourceId)}, Text: ${task.text}`);
        console.log(`  2. ID: ${task.id}, Text: ${task.text}`);
      } else {
        sourceIdMap.set(task.sourceId, task.id);
      }
    }
    
    if (duplicateSourceIds > 0) {
      console.log(`❌ FOUND ISSUE: ${duplicateSourceIds} duplicate source_ids detected`);
      console.log('This can cause task ID resolution errors during updates');
    } else {
      console.log('✅ SUCCESS: All source_ids are unique');
    }
    
    // TEST 4: Task Toggle Test for one Success Factor
    console.log('\n=== TEST 4: SUCCESS FACTOR TASK TOGGLE TEST ===');
    
    // Select a Success Factor task
    const taskToToggle = successFactors[0];
    
    console.log('Selected task to toggle:');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'none'}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // Toggle task
    const newCompletionState = !taskToToggle.completed;
    
    console.log(`Toggling task to ${newCompletionState}...`);
    
    const toggleResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${taskToToggle.id}`,
      { completed: newCompletionState }
    );
    
    if (!toggleResponse.ok) {
      console.error(`❌ FAILED: Task toggle returned ${toggleResponse.status}`);
      console.error('Response:', toggleResponse.data);
      throw new Error(`Task toggle failed: ${toggleResponse.status}`);
    }
    
    console.log('Toggle response:', toggleResponse.data);
    
    // Get tasks again to verify
    const tasksAfter = await apiRequest(
      'GET',
      `/api/projects/${PROJECT_ID}/tasks`
    );
    
    // Find the toggled task
    const toggledTask = tasksAfter.data.find(t => t.id === taskToToggle.id);
    
    if (!toggledTask) {
      console.error(`❌ FAILED: Task ${taskToToggle.id} not found after toggle`);
      throw new Error('Task disappeared after toggle');
    }
    
    // Check if toggle worked
    if (toggledTask.completed === newCompletionState) {
      console.log(`✅ SUCCESS: Task toggle worked! New state: ${toggledTask.completed}`);
    } else {
      console.log(`❌ FAILED: Task toggle did not change state.`);
      console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
    }
    
    // TEST 5: Toggling by source_id instead of ID
    console.log('\n=== TEST 5: TOGGLE BY SOURCE ID TEST ===');
    
    if (!taskToToggle.sourceId) {
      console.log('Skipping test: Task has no source_id');
    } else {
      // Try to toggle using source_id instead of ID
      const reverseToggle = !toggledTask.completed;
      
      console.log(`Toggling task by source_id to ${reverseToggle}...`);
      
      const sourceIdToggleResponse = await apiRequest(
        'PUT',
        `/api/projects/${PROJECT_ID}/tasks/${taskToToggle.sourceId}`,
        { completed: reverseToggle }
      );
      
      if (!sourceIdToggleResponse.ok) {
        console.log(`❌ NOTE: Toggle by source_id returned ${sourceIdToggleResponse.status}`);
        console.log('This is expected if source_id is not being used for task resolution');
      } else {
        console.log('✅ NOTE: Toggle by source_id worked!');
        console.log('This indicates the task resolver is able to use source_id for lookups');
      }
      
      // Get tasks again to verify
      const tasksAfterSourceIdToggle = await apiRequest(
        'GET',
        `/api/projects/${PROJECT_ID}/tasks`
      );
      
      // Find the toggled task
      const sourceIdToggledTask = tasksAfterSourceIdToggle.data.find(t => t.id === taskToToggle.id);
      
      if (sourceIdToggledTask && sourceIdToggledTask.completed === reverseToggle) {
        console.log('✅ SUCCESS: Toggle by source_id changed the task state');
        console.log('This indicates the task resolver is working with source_id lookups');
      }
    }
    
    // SUMMARY
    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    
    if (missingTasks > 0) {
      console.log('📌 ISSUE 1: Some Success Factor tasks are not being properly created in the database');
      console.log('This can explain why toggled states are not persisting after page reload');
    }
    
    if (duplicateSourceIds > 0) {
      console.log('📌 ISSUE 2: Duplicate source_ids detected in the task list');
      console.log('This can cause task resolution ambiguity during updates');
    }
    
    if (!toggledTask || toggledTask.completed !== newCompletionState) {
      console.log('📌 ISSUE 3: Task toggle is not working properly');
      console.log('This indicates a problem with the update process itself');
    }
    
    // Provide comprehensive diagnosis
    console.log('\n=== ROOT CAUSE ANALYSIS ===');
    
    if (missingTasks > 0) {
      console.log('Most likely cause: Phantom Success Factor tasks');
      console.log(`
The UI is showing Success Factor tasks that don't actually exist in the database.
When you toggle these tasks, the updates appear to work in the API response,
but the changes aren't persisted because the task doesn't exist in the database.
      `);
      
      console.log('Solution: Ensure all Success Factor tasks exist in the database');
      console.log(`
1. When loading the checklist, use ?ensure=true to create missing tasks
2. Implement a background job to backfill all Success Factor tasks for all projects
3. Fix the task resolver to prevent updates to non-existent tasks
      `);
    } else if (duplicateSourceIds > 0) {
      console.log('Most likely cause: Ambiguous task resolution');
      console.log(`
The system is finding the wrong task during updates because multiple tasks
share the same source_id. This can cause updates to be applied to the wrong task,
or not be applied at all if the wrong project is referenced.
      `);
      
      console.log('Solution: Ensure source_id uniqueness and improve task resolution');
      console.log(`
1. Fix the task creation process to prevent duplicate source_ids
2. Implement a more robust task resolution that checks project_id in addition to ID or source_id
3. Consider adding a compound unique constraint on (project_id, source_id) in the database
      `);
    } else if (!toggledTask || toggledTask.completed !== newCompletionState) {
      console.log('Most likely cause: Task update process failure');
      console.log(`
The task exists in the database, but updates are not being applied correctly.
This could be due to transaction issues, validation failures, or authorization problems.
      `);
      
      console.log('Solution: Fix the task update process');
      console.log(`
1. Check server logs for errors during task updates
2. Verify the update SQL query is correctly formed and executed
3. Ensure proper error handling and transaction management
      `);
    } else {
      console.log('No critical issues detected in this test run.');
      console.log(`
If you're still seeing problems with task persistence:
1. Try the test again after reloading the page
2. Check for race conditions between UI updates and API calls
3. Verify there are no browser caching issues hiding the latest task states
      `);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
})();