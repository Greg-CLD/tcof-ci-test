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

(async function runPersistenceTest() {
  console.log("\n===== SUCCESS FACTOR TASK PERSISTENCE TEST =====\n");
  
  // Utility function to make authenticated API requests
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
    
    try {
      const response = await fetch(endpoint, options);
      console.log(`API ${method} ${endpoint} status: ${response.status}`);
      
      // Check response content type to help debug JSON parsing errors
      const contentType = response.headers.get('content-type') || '';
      console.log(`Response content type: ${contentType}`);
      
      if (!contentType.includes('application/json')) {
        console.warn(`WARNING: Response is not JSON (${contentType})`);
        const text = await response.text();
        console.warn(`Response text: ${text.substring(0, 200)}...`);
        return { success: false, status: response.status, error: 'Non-JSON response' };
      }
      
      if (!response.ok) {
        return { success: false, status: response.status };
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      console.error(`API request error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
  
  // Step 1: Get the current project ID
  let currentProjectId = window.location.pathname.split('/')[2];
  if (!currentProjectId) {
    console.error("Could not determine current project ID from URL");
    return;
  }
  
  console.log(`Current project ID: ${currentProjectId}`);
  
  // Step 2: Get all tasks for the current project
  console.log("\nFetching all tasks for the current project...");
  const tasksResult = await apiRequest('GET', `/api/projects/${currentProjectId}/tasks`);
  
  if (!tasksResult.success) {
    console.error("Failed to fetch tasks:", tasksResult);
    return;
  }
  
  const allTasks = tasksResult.data;
  console.log(`Found ${allTasks.length} total tasks`);
  
  // Step 3: Filter for Success Factor tasks
  const successFactorTasks = allTasks.filter(task => 
    task.origin === 'factor' || task.source === 'factor'
  );
  
  console.log(`\nFound ${successFactorTasks.length} Success Factor tasks:\n`);
  
  // Create a detailed mapping for analysis
  const taskMap = successFactorTasks.map(task => ({
    id: task.id,
    sourceId: task.sourceId || '<empty>',
    text: task.text,
    completed: task.completed,
    origin: task.origin || '<empty>',
    source: task.source || '<empty>',
    stage: task.stage || '<empty>'
  }));
  
  console.table(taskMap);
  
  // Step 4: Look for potential issues
  console.log("\nAnalyzing potential issues:");
  
  const invalidTasks = successFactorTasks.filter(task => !task.id);
  if (invalidTasks.length > 0) {
    console.error(`Found ${invalidTasks.length} tasks missing IDs`);
  }
  
  const missingSourceId = successFactorTasks.filter(task => !task.sourceId);
  if (missingSourceId.length > 0) {
    console.warn(`Found ${missingSourceId.length} Success Factor tasks missing sourceId`);
  }
  
  // Step 5: Test toggling a task
  if (successFactorTasks.length === 0) {
    console.error("No Success Factor tasks found to test toggling");
    return;
  }
  
  // Select a task to toggle
  const testTask = successFactorTasks[0];
  console.log(`\nSelected test task for toggling:`);
  console.log({
    id: testTask.id,
    sourceId: testTask.sourceId || '<empty>',
    text: testTask.text,
    completed: testTask.completed,
    origin: testTask.origin,
    source: testTask.source
  });
  
  // Step 6: Toggle the task completion state
  console.log(`\nToggling task completion state (${testTask.completed} -> ${!testTask.completed})...`);
  
  const updateData = {
    completed: !testTask.completed,
    status: !testTask.completed ? 'Done' : 'To Do',
    origin: testTask.origin || testTask.source,
    sourceId: testTask.sourceId || ''
  };
  
  // Log the request we're about to make for debugging
  console.log(`Making PUT request to: /api/projects/${currentProjectId}/tasks/${testTask.id}`);
  console.log("With payload:", JSON.stringify(updateData, null, 2));
  
  // Perform the update
  const updateResult = await apiRequest(
    'PUT',
    `/api/projects/${currentProjectId}/tasks/${testTask.id}`,
    updateData
  );
  
  if (!updateResult.success) {
    console.error(`Failed to update task: ${JSON.stringify(updateResult)}`);
    
    // Debug information for 404 errors
    if (updateResult.status === 404) {
      console.error(`
      ⚠️ 404 NOT FOUND ERROR DETECTED ⚠️
      
      This confirms the issue: The task ID (${testTask.id}) sent in the request
      doesn't exist in the database for this project.
      
      Potential causes:
      1. Task was deleted from database but still appears in UI
      2. Task ID mismatch between UI and database
      3. Incorrect project ID in request
      `);
    }
    return;
  }
  
  console.log("Update successful!");
  console.log("Updated task:", updateResult.data);
  
  // Step 7: Verify the change was persisted by fetching tasks again
  console.log("\nVerifying persistence by fetching tasks again...");
  const verifyResult = await apiRequest('GET', `/api/projects/${currentProjectId}/tasks`);
  
  if (!verifyResult.success) {
    console.error("Failed to verify task update:", verifyResult);
    return;
  }
  
  // Find the updated task
  const updatedTask = verifyResult.data.find(task => task.id === testTask.id);
  
  if (!updatedTask) {
    console.error(`Task with ID ${testTask.id} not found in refreshed data!`);
    return;
  }
  
  console.log("Task after update:");
  console.log({
    id: updatedTask.id,
    sourceId: updatedTask.sourceId || '<empty>',
    text: updatedTask.text,
    completed: updatedTask.completed,
    origin: updatedTask.origin,
    source: updatedTask.source
  });
  
  // Verify completion state changed
  if (updatedTask.completed === testTask.completed) {
    console.error("❌ Task completion state was NOT updated!");
  } else {
    console.log("✅ Task completion state was successfully updated and persisted!");
  }
  
  console.log("\n===== TEST COMPLETE =====");
})();