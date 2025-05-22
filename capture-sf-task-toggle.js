/**
 * Success Factor Task Toggle Evidence Collection
 * 
 * This script runs in the browser console and collects evidence for:
 * 1. PUT request/response for toggling a Success Factor task
 * 2. GET tasks before and after toggle
 * 3. UI Task mapping with IDs and sourceIds
 * 4. Server logs for task lookup
 */

(async function collectSFTaskEvidence() {
  // Helper for making API requests
  async function apiRequest(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`API Request to ${endpoint}:`, options);
    const response = await fetch(endpoint, options);
    
    // Log full response details
    console.log(`API Response:`, {
      status: response.status,
      headers: Object.fromEntries([...response.headers.entries()]),
      url: response.url
    });
    
    // Get the response JSON
    try {
      const data = await response.json();
      console.log(`API Response Body:`, data);
      return data;
    } catch (error) {
      console.error(`Error parsing response:`, error);
      const text = await response.text();
      console.log(`Raw response:`, text);
      return null;
    }
  }
  
  // 1. Get all tasks and collect task mapping
  console.log(`\n=== EVIDENCE 2: Tasks BEFORE toggle ===`);
  const projectId = window.location.pathname.split('/')[2];
  const tasksEndpoint = `/api/projects/${projectId}/tasks`;
  const allTasks = await apiRequest('GET', tasksEndpoint);
  
  // Extract Success Factor tasks
  const sfTasks = allTasks.filter(task => 
    task.origin === 'factor' || task.source === 'factor'
  );
  
  console.log(`Found ${allTasks.length} tasks total, ${sfTasks.length} Success Factor tasks`);
  
  // 3. Map all Success Factor tasks
  console.log(`\n=== EVIDENCE 3: Success Factor Task Mapping ===`);
  const taskMapping = sfTasks.map(task => ({
    id: task.id,
    sourceId: task.sourceId || '<empty>',
    text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
    completed: task.completed,
    origin: task.origin || '<empty>',
    source: task.source,
    updateIdUsed: task.sourceId && task.origin === 'factor' ? 'sourceId' : 'id'
  }));
  
  console.log(JSON.stringify(taskMapping, null, 2));
  
  // Select first Success Factor task to toggle
  const taskToToggle = sfTasks[0];
  if (!taskToToggle) {
    console.error('No Success Factor tasks found to toggle');
    return;
  }
  
  // 1. Toggle task and capture request/response
  console.log(`\n=== EVIDENCE 1: Toggle Success Factor Task Completion ===`);
  
  // Determine which ID to use (sourceId for success factors or regular id)
  const updateId = (taskToToggle.origin === 'factor' && taskToToggle.sourceId) ? 
    taskToToggle.sourceId : taskToToggle.id;
  
  console.log(`Task chosen for toggle:`, {
    id: taskToToggle.id,
    sourceId: taskToToggle.sourceId || '<empty>',
    origin: taskToToggle.origin || '<empty>',
    source: taskToToggle.source,
    completed: taskToToggle.completed,
    updateIdUsed: updateId
  });
  
  // Create update payload
  const updateData = {
    completed: !taskToToggle.completed,
    status: !taskToToggle.completed ? 'Done' : 'To Do',
    origin: taskToToggle.origin || taskToToggle.source,
    sourceId: taskToToggle.sourceId || ''
  };
  
  // Toggle the task
  const toggleEndpoint = `/api/projects/${projectId}/tasks/${updateId}`;
  console.log(`Sending PUT request to ${toggleEndpoint}`);
  console.log(`Request body:`, updateData);
  const toggleResponse = await apiRequest('PUT', toggleEndpoint, updateData);
  
  // 2. Get tasks after toggle
  console.log(`\n=== EVIDENCE 2 (continued): Tasks AFTER toggle ===`);
  const updatedTasks = await apiRequest('GET', tasksEndpoint);
  
  // Find toggled task in updated tasks
  const updatedTask = updatedTasks.find(t => t.id === taskToToggle.id);
  
  if (updatedTask) {
    console.log(`Toggle verification:`, {
      text: updatedTask.text.substring(0, 30) + '...',
      beforeState: taskToToggle.completed,
      afterState: updatedTask.completed,
      togglePersisted: updatedTask.completed !== taskToToggle.completed ? 'YES' : 'NO'
    });
  } else {
    console.log('Task not found after toggle!');
  }
  
  console.log('Evidence collection complete! Check the console for the detailed results.');
})();