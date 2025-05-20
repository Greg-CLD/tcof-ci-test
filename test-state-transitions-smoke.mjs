
/**
 * Simple smoke test script to verify task state transition debugging
 * 
 * This script:
 * 1. Enables debug flags via environment variables
 * 2. Loads test credentials from environment variables or config file
 * 3. Logs in to the application
 * 4. Finds an existing project and task
 * 5. Toggles the task completion state
 * 6. Verifies the state change was persisted
 * 
 * To run this script:
 * 1. Create a config/test.env file with TEST_USERNAME and TEST_PASSWORD (see config/test.env.example)
 *    - or set these as environment variables
 * 2. Run with: node test-state-transitions-smoke.mjs
 */

// Use ES module syntax
import fetch from 'node-fetch';
import config from './tests/utils/testConfig.js';

// Global configuration - Use 0.0.0.0 for direct testing
const BASE_URL = 'http://0.0.0.0:5000';
console.log(`Using API URL: ${BASE_URL}`);

// Credentials loaded from environment variables or config file
const CREDENTIALS = {
  username: config.TEST_USERNAME, 
  password: config.TEST_PASSWORD
};

// Validate required credentials
if (!CREDENTIALS.username || !CREDENTIALS.password) {
  console.error('\x1b[31mError: Missing required test credentials\x1b[0m');
  console.error('Please set TEST_USERNAME and TEST_PASSWORD in config/test.env or as environment variables');
  process.exit(1);
}

console.log(`Using test credentials for user: ${CREDENTIALS.username}`);

// Global state
let cookie = '';
let projectId = null;
let taskId = null;

// Enable all relevant debug flags 
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

// Helper function for API requests with detailed logging
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
    console.log(`Request Body:`, JSON.stringify(body, null, 2));
  }
  
  console.log(`${method} ${endpoint}`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (response.headers.has('set-cookie')) {
      cookie = response.headers.get('set-cookie');
    }
    
    const data = response.status !== 204 ? await response.json() : null;
    
    console.log(`Response Status: ${response.status}`);
    if (data) {
      console.log(`Response Data:`, JSON.stringify(data, null, 2));
    }
    
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

// Step 3: Get Tasks with detailed logging
async function getTasks() {
  logHeader('FETCHING TASKS');
  
  if (!projectId) {
    console.error('No project ID available, cannot fetch tasks');
    return false;
  }
  
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  console.log(`Tasks API status: ${status}`);
  
  if (status === 200 && data && data.tasks && data.tasks.length > 0) {
    // Specifically look for a SuccessFactor task
    const successFactorTask = data.tasks.find(task => 
      task.origin === 'success-factor' || task.origin === 'factor'
    );
    
    const selectedTask = successFactorTask || data.tasks[0];
    taskId = selectedTask.id;
    
    console.log(`Selected task ID: ${taskId}`);
    console.log(`Task text: ${selectedTask.text?.substring(0, 50)}...`);
    console.log(`Task origin: ${selectedTask.origin}`);
    console.log(`Current completion state: ${selectedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`Full task data:`, JSON.stringify(selectedTask, null, 2));
    
    if (selectedTask.origin === 'success-factor' || selectedTask.origin === 'factor') {
      console.log('*** Found a SuccessFactor task - perfect for debugging! ***');
    }
    
    return true;
  }
  
  console.log('No tasks found for this project. Creating test task...');
  
  const newTask = {
    text: 'Test task for state transition debugging',
    stage: 'identification',
    completed: false,
    notes: 'Created by smoke test',
    origin: 'success-factor'
  };
  
  const { status: createStatus, data: createData } = await apiRequest(
    'POST', 
    `/api/projects/${projectId}/tasks`,
    newTask
  );
  
  if (createStatus === 201 && createData && createData.id) {
    taskId = createData.id;
    console.log(`Created new test task with ID: ${taskId}`);
    console.log('Full created task data:', JSON.stringify(createData, null, 2));
    return true;
  }
  
  console.error('Failed to find or create tasks');
  return false;
}

// Step 4: Toggle Task Completion State with enhanced validation
async function toggleTaskCompletion() {
  logHeader('TOGGLING TASK COMPLETION STATE');
  
  if (!projectId || !taskId) {
    console.error('No project ID or task ID available');
    return false;
  }
  
  // Get current state first
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
  console.log('Current task data:', JSON.stringify(task, null, 2));
  
  // Toggle the completion state
  const newCompletionState = !task.completed;
  console.log(`Changing completion state to: ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  const updatePayload = {
    completed: newCompletionState
  };
  
  // Attempt the update
  const { status: updateStatus, data: updateData } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${taskId}`,
    updatePayload
  );
  
  console.log(`Update API status: ${updateStatus}`);
  console.log('Update response:', JSON.stringify(updateData, null, 2));
  
  if (updateStatus === 200) {
    console.log('Task update successful');
    
    // Verify the state was actually updated
    const { status: verifyStatus, data: verifyData } = await apiRequest(
      'GET', 
      `/api/projects/${projectId}/tasks`
    );
    
    if (verifyStatus === 200 && verifyData && verifyData.tasks) {
      const verifiedTask = verifyData.tasks.find(t => t.id === taskId);
      
      if (verifiedTask) {
        console.log(`Verified task completion state after update: ${verifiedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
        console.log(`State transition successful? ${verifiedTask.completed === newCompletionState ? 'YES' : 'NO'}`);
        console.log('Full verified task data:', JSON.stringify(verifiedTask, null, 2));
        
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
