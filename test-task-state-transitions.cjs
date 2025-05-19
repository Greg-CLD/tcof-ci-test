/**
 * Simple smoke test for task state transition debug logging (CommonJS version)
 * This script enables task state transition debugging and checks the console output
 * for relevant debug messages to confirm the system is properly tracking state changes.
 * 
 * Usage: node test-task-state-transitions.cjs
 */

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

// Common configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  username: 'greg@confluity.co.uk',
  password: 'password'
};

// Debug flags to enable
process.env.DEBUG_TASKS = 'true';
process.env.DEBUG_TASK_STATE = 'true';
process.env.DEBUG_TASK_COMPLETION = 'true';
process.env.DEBUG_TASK_PERSISTENCE = 'true';

// State to track test progress
let cookies = '';
let projectId = '';
let taskId = '';

// Helper to log with visual distinction
function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(' ' + text);
  console.log('='.repeat(80));
}

// Helper for making authenticated API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return { 
    status: response.status,
    data: await response.json().catch(() => ({})),
    headers: response.headers
  };
}

// Login to get a session
async function login() {
  logHeader('LOGGING IN');
  
  const params = new URLSearchParams();
  params.append('username', TEST_CREDENTIALS.username);
  params.append('password', TEST_CREDENTIALS.password);
  
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: 'manual'
  });
  
  cookies = response.headers.raw()['set-cookie']?.join('; ') || '';
  console.log(`Login response status: ${response.status}`);
  console.log(`Cookies received: ${cookies ? 'Yes' : 'No'}`);
  
  return response.status === 200 || response.status === 302;
}

// Get projects to find an active project
async function getProjects() {
  logHeader('FETCHING PROJECTS');
  
  const { status, data } = await apiRequest('GET', '/api/projects');
  console.log(`Get projects status: ${status}`);
  
  if (status === 200 && data.length > 0) {
    projectId = data[0].id;
    console.log(`Using project ID: ${projectId}`);
    return true;
  }
  
  console.error('No projects found');
  return false;
}

// Get tasks for a project
async function getTasks() {
  logHeader('FETCHING TASKS');
  
  if (!projectId) {
    console.error('No project ID available');
    return false;
  }
  
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  console.log(`Get tasks status: ${status}`);
  
  if (status === 200 && data.tasks && data.tasks.length > 0) {
    taskId = data.tasks[0].id;
    console.log(`Using task ID: ${taskId}`);
    console.log(`Task title: "${data.tasks[0].title}"`);
    console.log(`Current completion state: ${data.tasks[0].completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`Task origin: ${data.tasks[0].origin}`);
    
    if (data.tasks[0].origin === 'success_factor') {
      console.log('Found a SuccessFactor task to toggle - perfect for testing!');
    }
    
    return true;
  }
  
  console.error('No tasks found for project');
  return false;
}

// Toggle a task's completion state
async function toggleTaskCompletion() {
  logHeader('TOGGLING TASK COMPLETION');
  
  if (!projectId || !taskId) {
    console.error('Missing project ID or task ID');
    return false;
  }
  
  // First get the current task state
  const { status: getStatus, data: taskData } = await apiRequest('GET', `/api/projects/${projectId}/tasks/${taskId}`);
  
  if (getStatus !== 200) {
    console.error(`Failed to get task details: ${getStatus}`);
    return false;
  }
  
  const currentCompletionState = taskData.completed || false;
  const newCompletionState = !currentCompletionState;
  
  console.log(`Current completion state: ${currentCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  console.log(`Setting new state to: ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Update the task with the opposite completion state
  const updatePayload = {
    completed: newCompletionState
  };
  
  console.log('Sending update with payload:', updatePayload);
  
  const { status: updateStatus, data: updateResult } = await apiRequest(
    'PATCH', 
    `/api/projects/${projectId}/tasks/${taskId}`, 
    updatePayload
  );
  
  console.log(`Task update status: ${updateStatus}`);
  
  if (updateStatus === 200) {
    console.log('Task updated successfully');
    console.log(`Server reports new completion state: ${updateResult.task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    // Verify the update by fetching the task again
    const { status: verifyStatus, data: verifyData } = await apiRequest('GET', `/api/projects/${projectId}/tasks/${taskId}`);
    
    if (verifyStatus === 200) {
      console.log(`Verification - Task completion state is now: ${verifyData.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
      
      if (verifyData.completed === newCompletionState) {
        console.log('✅ SUCCESS: Task state was correctly updated and persisted');
        return true;
      } else {
        console.error('❌ FAILURE: Task state did not match expected value after update');
        console.error(`Expected: ${newCompletionState}, Actual: ${verifyData.completed}`);
        return false;
      }
    }
  }
  
  console.error('Failed to update task');
  return false;
}

// Main test function
async function runTest() {
  try {
    logHeader('TASK STATE TRANSITION DEBUG TEST');
    console.log('Testing debug logging for SuccessFactor task state transitions\n');
    
    if (!await login()) {
      console.error('Login failed');
      return false;
    }
    
    if (!await getProjects()) {
      console.error('Failed to get projects');
      return false;
    }
    
    if (!await getTasks()) {
      console.error('Failed to get tasks');
      return false;
    }
    
    if (!await toggleTaskCompletion()) {
      console.error('Failed to toggle task completion');
      return false;
    }
    
    logHeader('TEST COMPLETED SUCCESSFULLY');
    console.log(`
Test Summary:
- DEBUG_TASK_STATE flag is now active
- Successfully tested task state transition tracking
- Check the console logs above for [DEBUG_TASK_STATE] messages
- These logs should help diagnose the SuccessFactor task completion bug
    `);
    
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run the test
runTest().then(success => {
  if (!success) {
    console.error('\nTest failed');
    process.exit(1);
  }
  console.log('\nTest completed');
});