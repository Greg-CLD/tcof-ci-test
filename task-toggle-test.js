/**
 * Success Factor Task Toggle Test
 * 
 * This script directly tests toggling Success Factor tasks and captures the entire process
 * including the request URL, payload, and response to help identify why 404 errors occur.
 * 
 * To use:
 * 1. Open the project in your browser
 * 2. Navigate to the Checklist page
 * 3. Open browser console (F12 or Command+Option+I)
 * 4. Paste this entire script and press Enter
 */

(async function() {
  console.clear();
  console.log("=== SUCCESS FACTOR TASK TOGGLE TEST ===");
  
  // Get current project ID from URL
  const projectId = window.location.pathname.split('/')[2];
  console.log(`Current project ID: ${projectId}`);
  
  // Utility function for API requests
  async function apiRequest(method, url, body = null) {
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
    
    console.log(`Making ${method} request to: ${url}`);
    if (body) console.log('Request payload:', body);
    
    try {
      const response = await fetch(url, options);
      console.log(`Response status: ${response.status}`);
      
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      console.log(`Response content type: ${contentType}`);
      
      if (!contentType.includes('application/json')) {
        console.warn('WARNING: Non-JSON response received');
        const text = await response.text();
        console.warn(`Response text (first 200 chars): ${text.substring(0, 200)}...`);
        return { success: false, status: response.status, error: 'Non-JSON response' };
      }
      
      if (!response.ok) {
        return { success: false, status: response.status };
      }
      
      const data = await response.json();
      return { success: true, data };
      
    } catch (error) {
      console.error('API request error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Get all tasks
  console.log("\nFetching all tasks...");
  const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!tasksResponse.success) {
    console.error('Failed to fetch tasks');
    return;
  }
  
  const tasks = tasksResponse.data;
  console.log(`Found ${tasks.length} total tasks`);
  
  // Filter for Success Factor tasks
  const successFactorTasks = tasks.filter(task => 
    task.origin === 'factor' || task.source === 'factor'
  );
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  
  if (successFactorTasks.length === 0) {
    console.error('No Success Factor tasks found for testing');
    return;
  }
  
  // Log all Success Factor tasks with their IDs and sourceIds
  console.log("\nSuccess Factor tasks:");
  successFactorTasks.forEach((task, index) => {
    console.log(`[${index}] ID: ${task.id}, sourceId: ${task.sourceId || '<empty>'}, text: ${task.text}`);
  });
  
  // Select a task to toggle
  const taskIndex = 0; // Use first task by default
  const taskToToggle = successFactorTasks[taskIndex];
  
  console.log(`\nSelected task for toggle test: 
  - Text: ${taskToToggle.text}
  - ID: ${taskToToggle.id}
  - sourceId: ${taskToToggle.sourceId || '<empty>'}
  - Current completion: ${taskToToggle.completed}
  - Origin: ${taskToToggle.origin || '<empty>'}
  - Source: ${taskToToggle.source || '<empty>'}`);
  
  // Create update data
  const updateData = {
    completed: !taskToToggle.completed,
    status: !taskToToggle.completed ? 'Done' : 'To Do',
    origin: taskToToggle.origin || taskToToggle.source,
    sourceId: taskToToggle.sourceId || ''
  };
  
  // Toggle the task using the id (correct approach)
  console.log("\nToggling task using ID in URL path...");
  const updateUrl = `/api/projects/${projectId}/tasks/${taskToToggle.id}`;
  
  console.log(`PUT ${updateUrl}`);
  console.log('Payload:', updateData);
  
  const updateResponse = await apiRequest('PUT', updateUrl, updateData);
  
  if (!updateResponse.success) {
    console.error(`Failed to update task. Status: ${updateResponse.status}`);
    
    if (updateResponse.status === 404) {
      console.error(`
      ⚠️ 404 NOT FOUND ERROR DETECTED ⚠️
      
      The task ID (${taskToToggle.id}) used in the request URL was not found.
      This means either:
      1. The task doesn't exist in the database
      2. The ID format is incorrect
      3. The lookup logic has an issue
      `);
    }
  } else {
    console.log("✅ Task update SUCCESS!");
    console.log("Updated task:", updateResponse.data);
  }
  
  // Verify the update by fetching tasks again
  console.log("\nVerifying task state by fetching tasks again...");
  const verifyResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!verifyResponse.success) {
    console.error('Failed to verify task update');
    return;
  }
  
  const updatedTasks = verifyResponse.data;
  const updatedTask = updatedTasks.find(t => t.id === taskToToggle.id);
  
  if (!updatedTask) {
    console.error(`Task with ID ${taskToToggle.id} not found after update!`);
    return;
  }
  
  console.log("Task after update:");
  console.log(`
  - Text: ${updatedTask.text}
  - ID: ${updatedTask.id}
  - sourceId: ${updatedTask.sourceId || '<empty>'}
  - Current completion: ${updatedTask.completed}
  - Origin: ${updatedTask.origin || '<empty>'}
  - Source: ${updatedTask.source || '<empty>'}`);
  
  // Check if completion state was updated
  if (updatedTask.completed === taskToToggle.completed) {
    console.error("❌ Task completion state was NOT updated!");
  } else {
    console.log("✅ Task completion state was successfully updated!");
  }
  
  console.log("\n=== TEST COMPLETE ===");
})();