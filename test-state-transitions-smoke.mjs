/**
 * Simple smoke test script to verify task state transition debugging
 * 
 * This script:
 * 1. Enables debug flags via environment variables
 * 2. Logs in to the application
 * 3. Finds an existing project and task
 * 4. Toggles the task completion state
 * 5. Verifies the state change was persisted
 */

// Use ES module syntax
import fetch from 'node-fetch';

// Global configuration - Use localhost for direct testing
const BASE_URL = 'http://localhost:3000';
console.log(`Using API URL: ${BASE_URL}`);

// Credentials used for smoke test
const CREDENTIALS = {
  username: 'greg@confluity.co.uk', 
  password: 'confluity' // updated to match the test user's actual password
};

// Global state
let cookie = '';
let projectId = null;
let taskId = null;

// Enable debug flags as environment variables
process.env.DEBUG_TASKS = 'true';
process.env.DEBUG_TASK_API = 'true';
process.env.DEBUG_TASK_COMPLETION = 'true';
process.env.DEBUG_TASK_PERSISTENCE = 'true';
process.env.DEBUG_TASK_STATE = 'true';

// Utility to log section headers
function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(`${text.toUpperCase()}`);
  console.log('='.repeat(80));
}

// Helper function for API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Store cookie from login response
    if (response.headers.has('set-cookie')) {
      cookie = response.headers.get('set-cookie');
    }
    
    const data = response.status !== 204 ? await response.json() : null;
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    return { status: 0, error };
  }
}

// Step 1: Login
async function login() {
  logHeader('LOGGING IN');
  
  const { status, data } = await apiRequest('POST', '/api/login', CREDENTIALS);
  console.log(`Login API status: ${status}`);
  
  if (status === 200) {
    console.log('Successfully logged in');
    return true;
  } else {
    console.error('Login failed:', data?.message || 'Unknown error');
    return false;
  }
}

// Step 2: Get Projects
async function getProjects() {
  logHeader('FETCHING PROJECTS');
  
  const { status, data } = await apiRequest('GET', '/api/projects');
  console.log(`Projects API status: ${status}`);
  
  if (status === 200 && data && data.length > 0) {
    projectId = data[0].id;
    console.log(`Selected project ID: ${projectId}`);
    console.log(`Project name: ${data[0].name}`);
    return true;
  }
  
  console.error('No projects found');
  return false;
}

// Step 3: Get Tasks
async function getTasks() {
  logHeader('FETCHING TASKS');
  
  if (!projectId) {
    console.error('No project ID available, cannot fetch tasks');
    return false;
  }
  
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  console.log(`Tasks API status: ${status}`);
  
  if (status === 200 && data && data.tasks && data.tasks.length > 0) {
    // Select a task (preferably a SuccessFactor task)
    const successFactorTask = data.tasks.find(task => 
      task.origin === 'success-factor' || task.origin === 'factor'
    );
    
    const selectedTask = successFactorTask || data.tasks[0];
    taskId = selectedTask.id;
    
    console.log(`Selected task ID: ${taskId}`);
    console.log(`Task text: ${selectedTask.text?.substring(0, 50)}...`);
    console.log(`Task origin: ${selectedTask.origin}`);
    console.log(`Current completion state: ${selectedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    if (selectedTask.origin === 'success-factor' || selectedTask.origin === 'factor') {
      console.log('*** Found a SuccessFactor task - perfect for debugging! ***');
    }
    
    return true;
  }
  
  console.log('No tasks found for this project. Let\'s create one.');
  
  // Create a test task if none exist
  const newTask = {
    text: 'Test task for state transition debugging',
    stage: 'identification',
    completed: false,
    notes: 'Created by smoke test'
  };
  
  const { status: createStatus, data: createData } = await apiRequest(
    'POST', 
    `/api/projects/${projectId}/tasks`,
    newTask
  );
  
  if (createStatus === 201 && createData && createData.id) {
    taskId = createData.id;
    console.log(`Created new test task with ID: ${taskId}`);
    return true;
  }
  
  console.error('Failed to find or create tasks');
  return false;
}

// Step 4: Toggle Task Completion State
async function toggleTaskCompletion() {
  logHeader('TOGGLING TASK COMPLETION STATE');
  
  if (!projectId || !taskId) {
    console.error('No project ID or task ID available');
    return false;
  }
  
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  if (status !== 200 || !data || !data.tasks) {
    console.error('Failed to get current task state');
    return false;
  }
  
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) {
    console.error('Could not find task in current task list');
    return false;
  }
  
  console.log(`Current task completion state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Toggle the completion state
  const newCompletionState = !task.completed;
  console.log(`Changing completion state to: ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  const updatePayload = {
    completed: newCompletionState
  };
  
  const { status: updateStatus, data: updateData } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${taskId}`,
    updatePayload
  );
  
  console.log(`Update API status: ${updateStatus}`);
  
  if (updateStatus === 200) {
    console.log('Task update successful.');
    
    // Verify the state was actually updated on the server
    const { status: verifyStatus, data: verifyData } = await apiRequest(
      'GET', 
      `/api/projects/${projectId}/tasks`
    );
    
    if (verifyStatus === 200 && verifyData && verifyData.tasks) {
      const verifiedTask = verifyData.tasks.find(t => t.id === taskId);
      
      if (verifiedTask) {
        console.log(`Verified task completion state after update: ${verifiedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
        console.log(`State transition successful? ${verifiedTask.completed === newCompletionState ? 'YES' : 'NO'}`);
        
        if (verifiedTask.completed !== newCompletionState) {
          console.error('❌ STATE TRANSITION FAILED - completion state was not persisted!');
          return false;
        } else {
          console.log('✅ SUCCESS - Task state was properly updated and persisted');
          return true;
        }
      }
    }
    
    console.error('Failed to verify task update');
    return false;
  }
  
  console.error('Task update failed:', updateData?.message || 'Unknown error');
  return false;
}

// Main test function
async function runTest() {
  console.log('Starting task state transition smoke test...');
  console.log('Debug flags enabled for this test run:');
  console.log('- DEBUG_TASKS=true');
  console.log('- DEBUG_TASK_API=true');
  console.log('- DEBUG_TASK_COMPLETION=true');
  console.log('- DEBUG_TASK_PERSISTENCE=true'); 
  console.log('- DEBUG_TASK_STATE=true');
  
  // Execute test steps in sequence
  if (await login()) {
    if (await getProjects()) {
      if (await getTasks()) {
        await toggleTaskCompletion();
      }
    }
  }
  
  console.log('\nTest complete.');
}

// Run the test and handle any errors
runTest().catch(err => {
  console.error('Test failed with error:', err);
});