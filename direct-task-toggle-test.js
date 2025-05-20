/**
 * Task State Transition Direct Test
 * 
 * This script tests task state transitions by directly:
 * 1. Connecting to the API endpoints
 * 2. Using existing session cookies from the browser
 * 3. Finding a project and task
 * 4. Toggling the task's completion state
 * 5. Verifying the state change was persisted
 * 
 * Run this script while logged in via the browser to leverage the active session
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Global configuration
const BASE_URL = 'http://0.0.0.0:5000';
console.log(`Using API URL: ${BASE_URL}`);

// Global state variables
let cookie = '';
let projectId = null;
let taskId = null;
let task = null;

// Enable all relevant debug flags
process.env.DEBUG_TASKS = 'true';
process.env.DEBUG_TASK_API = 'true';
process.env.DEBUG_TASK_COMPLETION = 'true';
process.env.DEBUG_TASK_PERSISTENCE = 'true';
process.env.DEBUG_TASK_STATE = 'true';

// Read cookie from cookies.txt file (create this file with your actual cookie)
try {
  if (fs.existsSync('./cookies.txt')) {
    cookie = fs.readFileSync('./cookies.txt', 'utf8').trim();
    console.log('Using cookie from cookies.txt file');
  } else {
    console.log('No cookies.txt file found. Attempting to continue without authentication.');
  }
} catch (err) {
  console.error('Error reading cookies file:', err);
}

// Helper function for API requests with detailed logging
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    }
  };
  
  console.log(`\n${method} ${endpoint}`);
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log(`Request body:`, JSON.stringify(body, null, 2));
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (response.headers.has('set-cookie')) {
      cookie = response.headers.get('set-cookie');
      console.log('Cookie updated from response');
    }
    
    let data = null;
    
    if (response.status !== 204) {
      try {
        data = await response.json();
      } catch (error) {
        console.log('Response is not JSON or is empty');
      }
    }
    
    console.log(`Response status: ${response.status}`);
    if (data) {
      console.log('Response data:', JSON.stringify(data, null, 2));
    }
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    return { status: 0, error };
  }
}

// Step 1: Get Projects
async function getProjects() {
  console.log('\n=== FETCHING PROJECTS ===');
  
  const { status, data } = await apiRequest('GET', '/api/projects');
  
  if (status === 200 && data && data.length > 0) {
    projectId = data[0].id;
    console.log(`\nSelected project ID: ${projectId}`);
    console.log(`Project name: ${data[0].name}`);
    return true;
  }
  
  console.error('No projects found or unauthorized');
  return false;
}

// Step 2: Get Tasks
async function getTasks() {
  console.log('\n=== FETCHING TASKS ===');
  
  if (!projectId) {
    console.error('No project ID available');
    return false;
  }
  
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (status === 200 && data && data.tasks && data.tasks.length > 0) {
    // Try to find a task with origin: success-factor or origin: factor
    const successFactorTask = data.tasks.find(t => 
      t.origin === 'success-factor' || t.origin === 'factor'
    );
    
    task = successFactorTask || data.tasks[0];
    taskId = task.id;
    
    console.log(`\nSelected task ID: ${taskId}`);
    console.log(`Task text: ${task.text}`);
    console.log(`Current completion state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    return true;
  }
  
  console.log('No tasks found for this project. Creating test task...');
  
  const newTask = {
    text: 'Test task for state transition debugging',
    stage: 'identification',
    completed: false,
    notes: 'Created by direct test script',
    origin: 'success-factor'
  };
  
  const { status: createStatus, data: createData } = await apiRequest(
    'POST', 
    `/api/projects/${projectId}/tasks`,
    newTask
  );
  
  if (createStatus === 201 && createData && createData.id) {
    task = createData;
    taskId = createData.id;
    console.log(`Created new test task with ID: ${taskId}`);
    return true;
  }
  
  console.error('Failed to find or create tasks');
  return false;
}

// Step 3: Toggle Task Completion State
async function toggleTaskCompletion() {
  console.log('\n=== TOGGLING TASK COMPLETION STATE ===');
  
  if (!projectId || !taskId || !task) {
    console.error('Missing project ID, task ID, or task data');
    return false;
  }
  
  console.log(`Current task completion state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Toggle the completion state
  const newCompletionState = !task.completed;
  console.log(`Toggling to: ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  const { status, data } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${taskId}`,
    { completed: newCompletionState }
  );
  
  if (status === 200) {
    console.log(`Task update successful!`);
    
    // Verify the change was persisted
    return await verifyTaskState(newCompletionState);
  }
  
  console.error('Task update failed');
  return false;
}

// Step 4: Verify Task State Persistence
async function verifyTaskState(expectedState) {
  console.log('\n=== VERIFYING TASK STATE PERSISTENCE ===');
  
  // Fetch tasks again to verify the state was persisted
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (status === 200 && data && data.tasks) {
    const updatedTask = data.tasks.find(t => t.id === taskId);
    
    if (!updatedTask) {
      console.error('Could not find task in verification query');
      return false;
    }
    
    console.log(`Verified task state: ${updatedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`Expected state: ${expectedState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    if (updatedTask.completed === expectedState) {
      console.log('✅ SUCCESS: Task state was correctly persisted!');
      return true;
    } else {
      console.error('❌ FAILURE: Task state was not correctly persisted');
      return false;
    }
  }
  
  console.error('Failed to verify task state');
  return false;
}

// Main function
async function runTest() {
  console.log('Starting direct task state transition test...');
  const startTime = Date.now();
  
  // Execute steps in sequence
  if (await getProjects()) {
    if (await getTasks()) {
      await toggleTaskCompletion();
    }
  }
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`\nTest completed in ${duration.toFixed(2)} seconds`);
}

// Run the test
runTest().catch(err => {
  console.error('Test failed with error:', err);
});