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

const fetch = require('node-fetch');

// Global configuration
const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = {
  username: 'greg@confluity.co.uk', 
  password: 'password' // assuming default test password
};

// Enable all debugging flags for comprehensive logging
process.env.DEBUG_TASKS = 'true';
process.env.DEBUG_TASK_STATE = 'true';
process.env.DEBUG_TASK_API = 'true';
process.env.DEBUG_TASK_COMPLETION = 'true';
process.env.DEBUG_TASK_PERSISTENCE = 'true';

// State variables
let sessionCookie = '';
let projectId = '';
let taskId = '';

// Utility to display section headers
function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(' ' + text);
  console.log('='.repeat(80));
}

// Utility to make authenticated API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return { 
    status: response.status,
    headers: response.headers,
    data: await response.json().catch(() => ({}))
  };
}

// Step 1: Log in to get authentication cookie
async function login() {
  logHeader('LOGGING IN');
  
  const params = new URLSearchParams();
  params.append('username', CREDENTIALS.username);
  params.append('password', CREDENTIALS.password);
  
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: 'manual'
  });
  
  const cookies = response.headers.raw()['set-cookie'];
  sessionCookie = cookies ? cookies.join('; ') : '';
  
  console.log(`Login status: ${response.status}`);
  console.log(`Session cookie: ${sessionCookie ? 'Received' : 'Not received'}`);
  
  return response.status === 200 || response.status === 302;
}

// Step 2: Get available projects
async function getProjects() {
  logHeader('FETCHING PROJECTS');
  
  const { status, data } = await apiRequest('GET', '/api/projects');
  console.log(`Projects API status: ${status}`);
  
  if (status === 200 && data && data.length > 0) {
    projectId = data[0].id;
    console.log(`Found project ID: ${projectId}`);
    console.log(`Project name: ${data[0].name}`);
    return true;
  }
  
  console.error('No projects found or API error');
  return false;
}

// Step 3: Get tasks for the selected project
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

// Step 4: Toggle task completion state
async function toggleTaskCompletion() {
  logHeader('TOGGLING TASK COMPLETION');
  
  if (!projectId || !taskId) {
    console.error('Missing project ID or task ID, cannot toggle completion');
    return false;
  }
  
  // First get current state
  const { status: getStatus, data: taskData } = await apiRequest(
    'GET', 
    `/api/projects/${projectId}/tasks/${taskId}`
  );
  
  if (getStatus !== 200 || !taskData) {
    console.error(`Failed to get task details: ${getStatus}`);
    return false;
  }
  
  const currentState = taskData.completed || false;
  const newState = !currentState;
  
  console.log(`Current state: ${currentState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  console.log(`Toggling to: ${newState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Update the task
  const { status: updateStatus, data: updateData } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${taskId}`,
    { completed: newState }
  );
  
  console.log(`Update API status: ${updateStatus}`);
  
  if (updateStatus === 200) {
    console.log('✅ Task update API call successful');
    
    // Verify the update was persisted
    const { status: verifyStatus, data: verifyData } = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks/${taskId}`
    );
    
    if (verifyStatus === 200) {
      const persistedState = verifyData.completed || false;
      console.log(`Verify API status: ${verifyStatus}`);
      console.log(`Persisted state: ${persistedState ? 'COMPLETED' : 'NOT COMPLETED'}`);
      
      if (persistedState === newState) {
        console.log('✅ VERIFICATION SUCCESSFUL: State change was properly persisted');
        return true;
      } else {
        console.log('❌ VERIFICATION FAILED: State change was not persisted correctly');
        console.log(`Expected: ${newState}, Actual: ${persistedState}`);
      }
    } else {
      console.error(`Verification failed with status: ${verifyStatus}`);
    }
  } else {
    console.error(`Task update failed with status: ${updateStatus}`);
    console.error('Error details:', updateData);
  }
  
  return false;
}

// Main test function
async function runTest() {
  logHeader('TASK STATE TRANSITION DEBUG TEST');
  console.log('Testing debug logging for task state transitions\n');
  
  try {
    // Step 1: Log in
    if (!await login()) {
      console.error('Login failed, aborting test');
      return { success: false, error: 'Authentication failed' };
    }
    
    // Step 2: Get projects
    if (!await getProjects()) {
      console.error('Failed to fetch projects, aborting test');
      return { success: false, error: 'No projects available' };
    }
    
    // Step 3: Get tasks
    if (!await getTasks()) {
      console.error('Failed to fetch or create tasks, aborting test');
      return { success: false, error: 'Could not get or create tasks' };
    }
    
    // Step 4: Toggle task completion
    const toggleResult = await toggleTaskCompletion();
    
    if (toggleResult) {
      logHeader('TEST SUMMARY - SUCCESS');
      console.log('✅ Successfully tested task state transition logging');
      console.log('✅ Toggled task completion state and verified persistence');
      console.log('📋 Check server logs for [DEBUG_TASK_STATE] entries');
      
      return { 
        success: true,
        projectId,
        taskId,
        message: 'Task state transition test completed successfully'
      };
    } else {
      logHeader('TEST SUMMARY - FAILURE');
      console.log('❌ Failed to toggle task completion or verify persistence');
      console.log('📋 Check server logs for [DEBUG_TASK_STATE] entries to debug issues');
      
      return {
        success: false, 
        projectId,
        taskId,
        error: 'Task state transition failed or was not persisted correctly'
      };
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  }
}

// Run the test and output result as JSON
runTest()
  .then(result => {
    console.log('\nTEST RESULT:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Failed to run test:', error);
    process.exit(1);
  });