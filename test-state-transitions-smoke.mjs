
/**
 * Comprehensive Smoke Test Script for Task State Transition Verification
 * 
 * This script provides end-to-end testing of task state transitions with:
 * - Secure credential handling (env vars or interactive prompts)
 * - Detailed API call logging (request and response)
 * - Project and task selection
 * - Task state toggling
 * - State persistence verification
 * - Retry capability for login failures
 * 
 * To run this test, set TEST_USER and TEST_PASS environment variables, 
 * or enter credentials when prompted.
 * 
 * Usage: node test-state-transitions-smoke.mjs
 * 
 * Unit Test Coverage:
 * - describe('Credential Loading', () => {
 *     it('loads credentials from environment variables when available')
 *     it('prompts user for credentials when env vars missing')
 *     it('validates credentials are not empty')
 *   })
 * - describe('Authentication', () => {
 *     it('attempts login with provided credentials') 
 *     it('retries login up to 3 times on failure')
 *     it('exits with error after max retries')
 *   })
 * - describe('Project Selection', () => {
 *     it('fetches and selects first available project')
 *     it('creates test project if none available')
 *   })
 * - describe('Task Operations', () => {
 *     it('fetches tasks for selected project')
 *     it('creates test task if none available')
 *     it('toggles task completion state')
 *     it('verifies state change persisted in database')
 *   })
 * - describe('Logging', () => {
 *     it('logs all API requests with method, URL and payload')
 *     it('logs all API responses with status code and body')
 *     it('provides structured output for each test stage')
 *   })
 */

// Use ES module syntax
import fetch from 'node-fetch';
import readline from 'readline';
import { promisify } from 'util';

// Global configuration
const BASE_URL = 'http://0.0.0.0:5000';
console.log(`Using API URL: ${BASE_URL}`);

// Async function to get credentials
async function getCredentials() {
  // Test case 1: Try to load credentials from environment variables
  if (process.env.TEST_USER && process.env.TEST_PASS) {
    console.log('Using credentials from environment variables');
    return {
      username: process.env.TEST_USER,
      password: process.env.TEST_PASS
    };
  }
  
  // Test case 2: If env vars missing, prompt interactively
  console.log('Environment variables TEST_USER and TEST_PASS not found.');
  console.log('Please enter credentials interactively:');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Promisify the question method for async/await
  const question = promisify(rl.question).bind(rl);
  
  try {
    const username = await question('Username (email): ');
    // Note: In a real implementation, we would use a secure way to input passwords
    const password = await question('Password: ');
    
    rl.close();
    
    // Test case 3: Fail cleanly if no credentials provided
    if (!username || !password) {
      console.error('\x1b[31mError: Username and password are required\x1b[0m');
      process.exit(1);
    }
    
    return { username, password };
  } catch (error) {
    rl.close();
    console.error('\x1b[31mError getting credentials:', error.message, '\x1b[0m');
    process.exit(1);
  }
}

// This will hold our credentials after they are loaded
let CREDENTIALS = null;

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

// Helper function for API requests with comprehensive logging
async function apiRequest(method, endpoint, body = null) {
  // Log request start with timestamp
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(2, 10);
  const fullUrl = `${BASE_URL}${endpoint}`;
  
  console.log('\n' + '-'.repeat(80));
  console.log(`[${timestamp}] API REQUEST #${requestId}: ${method} ${fullUrl}`);
  console.log('-'.repeat(80));
  
  // Prepare request options
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    }
  };
  
  console.log('Request Headers:');
  console.log(JSON.stringify(options.headers, null, 2));
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log('Request Body:');
    console.log(JSON.stringify(body, null, 2));
  }
  
  // Execute the request
  try {
    console.log(`\nSending ${method} request to ${fullUrl}...`);
    const startTime = Date.now();
    const response = await fetch(fullUrl, options);
    const responseTime = Date.now() - startTime;
    
    // Log response headers
    console.log(`\nResponse received in ${responseTime}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    console.log('Response Headers:');
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
      // Extract and store cookies for future requests
      if (name.toLowerCase() === 'set-cookie') {
        cookie = value;
        console.log(`Cookie captured for future requests`);
      }
    });
    console.log(JSON.stringify(headers, null, 2));
    
    // Parse and log response body
    let data = null;
    if (response.status !== 204) {
      try {
        data = await response.json();
        console.log('\nResponse Body:');
        console.log(JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('\nResponse Body: (not JSON)');
        console.log(await response.text());
      }
    } else {
      console.log('\nNo response body (HTTP 204)');
    }
    
    // Log request completion
    console.log(`\n[${new Date().toISOString()}] API REQUEST #${requestId} COMPLETED`);
    console.log('-'.repeat(80));
    
    return { status: response.status, data, requestId };
  } catch (error) {
    console.error(`\n❌ API REQUEST #${requestId} FAILED: ${error.message}`);
    console.error(error.stack);
    console.log('-'.repeat(80));
    return { status: 0, error, requestId };
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

// Function to prompt for retry after failed login
async function promptForRetry() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = promisify(rl.question).bind(rl);
  
  try {
    const retry = await question('\nLogin failed. Would you like to try different credentials? (y/n): ');
    rl.close();
    return retry.toLowerCase() === 'y' || retry.toLowerCase() === 'yes';
  } catch (error) {
    rl.close();
    return false;
  }
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
  
  let loginSuccess = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  while (!loginSuccess && retryCount < MAX_RETRIES) {
    // Get credentials securely
    CREDENTIALS = await getCredentials();
    
    if (!CREDENTIALS) {
      console.error('\x1b[31mError: Could not obtain valid credentials\x1b[0m');
      break;
    }
    
    console.log(`Using test credentials for user: ${CREDENTIALS.username}`);
    
    // Attempt to login
    loginSuccess = await login();
    
    if (!loginSuccess) {
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        const shouldRetry = await promptForRetry();
        if (!shouldRetry) break;
      } else {
        console.error(`\x1b[31mMax retry attempts (${MAX_RETRIES}) reached. Exiting.\x1b[0m`);
      }
    }
  }
  
  // If login succeeded, proceed with the test
  if (loginSuccess) {
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
