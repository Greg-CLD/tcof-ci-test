/**
 * Test script to verify that the 400 Bad Request error for Success Factor task toggling has been fixed.
 * 
 * This script:
 * 1. Gets tasks for an existing project, finding a Success Factor task
 * 2. Attempts to toggle that task's completion state
 * 3. Verifies the API returns a 200 OK response
 * 4. Gets the tasks again to verify the toggle persisted
 * 
 * Run in browser console while logged in
 */

async function testSuccessFactorToggleFix() {
  console.log('=== Testing Success Factor Task Toggle Fix ===');
  
  // Configuration - the base URL for API requests
  const BASE_URL = window.location.origin;
  
  // Step 1: Get existing projects
  console.log('Step 1: Getting existing projects...');
  const projectsResponse = await fetch(`${BASE_URL}/api/projects`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  
  if (!projectsResponse.ok) {
    console.error(`Failed to get projects: ${projectsResponse.status}`);
    return;
  }
  
  const projects = await projectsResponse.json();
  
  if (!projects || !projects.length) {
    console.error('No projects found for testing');
    return;
  }
  
  // Use the first project found
  const projectId = projects[0].id;
  console.log(`Using project ID: ${projectId}`);
  
  // Step 2: Get tasks for this project
  console.log('Step 2: Getting tasks...');
  const tasksResponse = await fetch(`${BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  
  if (!tasksResponse.ok) {
    console.error(`Failed to get tasks: ${tasksResponse.status}`);
    return;
  }
  
  const tasks = await tasksResponse.json();
  
  // Step 3: Find a Success Factor task
  console.log('Step 3: Finding a Success Factor task...');
  const successFactorTasks = tasks.filter(task => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  if (!successFactorTasks.length) {
    console.error('No Success Factor tasks found in project');
    return;
  }
  
  const taskToToggle = successFactorTasks[0];
  console.log(`Found Success Factor task: ${taskToToggle.id}`);
  console.log(`Current state: completed=${taskToToggle.completed}, origin=${taskToToggle.origin}`);
  
  // Step 4: Toggle the task - set to opposite of current completion state
  const newCompletedState = !taskToToggle.completed;
  console.log(`Step 4: Toggling task to completed=${newCompletedState}...`);
  
  const toggleResponse = await fetch(`${BASE_URL}/api/projects/${projectId}/tasks/${taskToToggle.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      completed: newCompletedState,
      status: newCompletedState ? 'Done' : 'To Do'
    })
  });
  
  console.log(`Toggle response status: ${toggleResponse.status}`);
  
  if (!toggleResponse.ok) {
    console.error('Task toggle failed!');
    try {
      const errorData = await toggleResponse.json();
      console.error('Error details:', errorData);
    } catch (e) {
      console.error('Could not parse error response');
    }
    return;
  }
  
  console.log(`✅ SUCCESS: PUT request returned ${toggleResponse.status} (should be 200)`);
  
  const toggleData = await toggleResponse.json();
  console.log('Toggle response data:', toggleData);
  
  // Step 5: Verify the task was toggled by getting tasks again
  console.log('Step 5: Verifying task state after toggle...');
  const verifyResponse = await fetch(`${BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  
  if (!verifyResponse.ok) {
    console.error(`Failed to verify task state: ${verifyResponse.status}`);
    return;
  }
  
  const verifyTasks = await verifyResponse.json();
  const updatedTask = verifyTasks.find(t => t.id === taskToToggle.id);
  
  if (!updatedTask) {
    console.error('Could not find task after toggle!');
    return;
  }
  
  console.log(`Updated task state: completed=${updatedTask.completed}, origin=${updatedTask.origin}`);
  
  if (updatedTask.completed === newCompletedState) {
    console.log(`✅ SUCCESS: Task state was correctly toggled to completed=${newCompletedState}`);
  } else {
    console.error(`❌ FAIL: Task state was not toggled correctly. Expected ${newCompletedState}, got ${updatedTask.completed}`);
  }
  
  // Check that origin field was preserved
  if (updatedTask.origin === taskToToggle.origin) {
    console.log(`✅ SUCCESS: Task origin field was correctly preserved as "${updatedTask.origin}"`);
  } else {
    console.error(`❌ FAIL: Task origin field changed from "${taskToToggle.origin}" to "${updatedTask.origin}"`);
  }
  
  console.log('=== Test Complete ===');
  
  return {
    success: toggleResponse.ok && updatedTask.completed === newCompletedState && updatedTask.origin === taskToToggle.origin,
    taskId: taskToToggle.id,
    originalState: {
      completed: taskToToggle.completed,
      origin: taskToToggle.origin
    },
    newState: {
      completed: updatedTask.completed,
      origin: updatedTask.origin
    }
  };
}

// Return the test function
testSuccessFactorToggleFix;