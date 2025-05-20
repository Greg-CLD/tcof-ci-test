// Quick test script for the task UUID cleaning fix
// This sends a direct API request to test if clean UUIDs work for task updates

import fs from 'fs';

// Extract the clean UUID part from a task ID
function cleanTaskId(taskId) {
  if (!taskId) return '';
  return taskId.split('-').slice(0, 5).join('-');
}

// Find an existing task ID from a recent response (if available)
function findExistingTaskId() {
  try {
    // Check if we have a tasks response saved from a previous request
    if (fs.existsSync('tasks-fetched.json')) {
      const tasks = JSON.parse(fs.readFileSync('tasks-fetched.json', 'utf8'));
      if (Array.isArray(tasks) && tasks.length > 0) {
        // Find a task with a UUID
        const task = tasks.find(t => t.id && t.id.includes('-'));
        if (task) {
          console.log(`Found existing task: ${task.id} (completed: ${task.completed})`);
          return {
            id: task.id,
            completed: task.completed
          };
        }
      }
    }
  } catch (err) {
    console.log('Error reading tasks file:', err.message);
  }
  
  return null;
}

// Main test function
async function testTaskUpdate() {
  console.log('===== TESTING UUID HANDLING IN TASK UPDATES =====');
  
  // Configuration
  const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  const baseUrl = 'http://localhost:5000';
  
  // Try to find an existing task ID
  const existingTask = findExistingTaskId();
  let taskId, originalState;
  
  if (existingTask) {
    taskId = existingTask.id;
    originalState = existingTask.completed;
  } else {
    console.log('No existing tasks found, using test task ID');
    taskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-success-factor';
    originalState = false;
  }
  
  // Extract just the clean UUID part
  const cleanId = cleanTaskId(taskId);
  
  console.log(`
Task Update Test:
- Project ID: ${projectId}
- Original Task ID: ${taskId}
- Clean UUID: ${cleanId}
- Current completion state: ${originalState}
- Will toggle to: ${!originalState}
`);

  try {
    // Send request to get a CSRF token and session cookie
    console.log('Getting session cookie...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk', 
        password: 'confluity'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Got cookies:', cookies ? 'Yes' : 'No');
    
    // Send the task update request using the CLEAN UUID in the URL
    console.log(`Sending PUT request to: ${baseUrl}/api/projects/${projectId}/tasks/${cleanId}`);
    
    const updateResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks/${cleanId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        completed: !originalState
      })
    });
    
    console.log(`Response status: ${updateResponse.status} ${updateResponse.statusText}`);
    
    const responseText = await updateResponse.text();
    console.log('Response body:', responseText);
    
    if (updateResponse.ok) {
      console.log('✅ SUCCESS: Task update with clean UUID worked!');
    } else {
      console.log('❌ FAILED: Task update with clean UUID failed.');
    }
    
    // Verify the server logs for our fix
    console.log('\nCheck the server logs to verify our UUID matching implementation is working:');
    console.log('Look for logs with "[TASK_LOOKUP]" prefix');
    
  } catch (error) {
    console.log('❌ ERROR during test:', error.message);
  }
  
  console.log('\n===== TEST COMPLETE =====');
}

// Run the test
testTaskUpdate();