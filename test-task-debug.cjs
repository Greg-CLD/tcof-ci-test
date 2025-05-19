/**
 * Diagnostic test script for task persistence with debug flags
 * This script tests the creation and completion of SuccessFactor tasks
 * with enhanced debug logging enabled
 */

// Import required modules
const { exec } = require('child_process');
const fetch = require('node-fetch');

// Set debug flags environment variables
process.env.DEBUG = 'true';
process.env.DEBUG_TASKS = 'true';
process.env.DEBUG_TASK_COMPLETION = 'true';
process.env.DEBUG_TASK_PERSISTENCE = 'true';
process.env.DEBUG_TASK_VALIDATION = 'true';

// Test parameters
const API_BASE_URL = 'http://localhost:5000';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Test project ID
const AUTH_COOKIE = ''; // Will be set after login

// Test credentials
const TEST_USER = 'greg@confluity.co.uk';

// Diagnostic logging function
function logDebug(type, message, data = null) {
  console.log(`[DEBUG_${type}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Login to get a session
async function login() {
  logDebug('TEST', 'Logging in to get authenticated session for task testing');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: TEST_USER,
        password: 'password1'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.status}`);
    }
    
    logDebug('TEST', 'Login successful');
    return response.headers.get('set-cookie');
  } catch (error) {
    logDebug('ERROR', `Login failed: ${error.message}`);
    process.exit(1);
  }
}

// Create a test task
async function createTask(cookie, completed = false) {
  logDebug('TEST', 'Creating test task with SuccessFactor origin');
  
  try {
    const taskData = {
      text: 'Test SuccessFactor task - ' + new Date().toISOString(),
      stage: 'Identification',
      origin: 'factor',
      sourceId: 'f219d47b-39b5-5be1-86f2-e0ec3afc8e3b', // Known factor ID
      completed: completed
    };
    
    logDebug('TASK_DATA', 'Task creation request data', taskData);
    
    const response = await fetch(`${API_BASE_URL}/api/projects/${PROJECT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error(`Task creation failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    logDebug('TASK_CREATED', 'Task created successfully', result);
    return result.task || result;
  } catch (error) {
    logDebug('ERROR', `Task creation failed: ${error.message}`);
    throw error;
  }
}

// Get all tasks for the project
async function getTasks(cookie) {
  logDebug('TEST', 'Getting all tasks to verify persistence');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${PROJECT_ID}/tasks`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Get tasks failed with status: ${response.status}`);
    }
    
    const tasks = await response.json();
    logDebug('TASKS_FETCHED', `Successfully retrieved ${tasks.length} tasks`);
    return tasks;
  } catch (error) {
    logDebug('ERROR', `Getting tasks failed: ${error.message}`);
    throw error;
  }
}

// Update a task to toggle its completion status
async function toggleTaskCompletion(cookie, task) {
  const newCompletionState = !task.completed;
  logDebug('TEST', `Updating task ${task.id} completion status to: ${newCompletionState}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${PROJECT_ID}/tasks/${task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        ...task,
        completed: newCompletionState
      })
    });
    
    if (!response.ok) {
      throw new Error(`Task update failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    logDebug('TASK_UPDATED', 'Task updated successfully', result);
    return result.task || result;
  } catch (error) {
    logDebug('ERROR', `Task update failed: ${error.message}`);
    throw error;
  }
}

// Main test sequence
async function runTest() {
  console.log('=== SuccessFactor Task Persistence Diagnostic Test ===');
  console.log('Starting test with debug flags enabled:');
  console.log('DEBUG_TASK_COMPLETION: true');
  console.log('DEBUG_TASK_PERSISTENCE: true');
  console.log('=================================================');
  
  try {
    // Login to get a session
    const cookie = await login();
    
    // Create a task that starts as incomplete
    console.log('\n[TEST SCENARIO 1] Create incomplete task and verify persistence');
    const task1 = await createTask(cookie, false);
    
    // Get all tasks to verify our task is there
    const tasks = await getTasks(cookie);
    console.log(`Total tasks after creation: ${tasks.length}`);
    const createdTask = tasks.find(t => t.id === task1.id);
    console.log(`Created task found: ${!!createdTask}, completed: ${createdTask?.completed}`);
    
    // Update the task to completed
    console.log('\n[TEST SCENARIO 2] Update task to completed and verify persistence');
    const updatedTask = await toggleTaskCompletion(cookie, task1);
    console.log(`Task updated, new completion status: ${updatedTask.completed}`);
    
    // Now fetch tasks again to verify update persisted
    const updatedTasks = await getTasks(cookie);
    const verifiedTask = updatedTasks.find(t => t.id === task1.id);
    console.log(`Updated task found: ${!!verifiedTask}, completed: ${verifiedTask?.completed}`);
    
    console.log('\n=== Diagnostic Test Complete ===');
  } catch (error) {
    console.error('\n[FATAL ERROR]', error);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  console.log('Test finished');
}).catch(err => {
  console.error('Test failed with error:', err);
});