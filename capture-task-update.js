/**
 * Comprehensive Debugging Script for Task State Transitions
 * 
 * This script captures all debug outputs for an end-to-end task state transition including:
 * 1. Request details
 * 2. Response details
 * 3. Server debug logs
 * 4. Task state before and after
 * 
 * Run with: node capture-task-update.js
 */
import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://0.0.0.0:5000';
console.log(`Using API URL: ${BASE_URL}`);

// Enable all debug flags
process.env.DEBUG_TASKS = 'true';
process.env.DEBUG_TASK_API = 'true';
process.env.DEBUG_TASK_COMPLETION = 'true';
process.env.DEBUG_TASK_PERSISTENCE = 'true';
process.env.DEBUG_TASK_STATE = 'true';
process.env.DEBUG_TASK_LOOKUP = 'true';
process.env.DEBUG_UUID_MATCHING = 'true';

// Create debug directory
if (!fs.existsSync('./debug-output')) {
  fs.mkdirSync('./debug-output');
}

// Read cookie from cookies.txt file
let cookie = '';
try {
  if (fs.existsSync('./cookies.txt')) {
    cookie = fs.readFileSync('./cookies.txt', 'utf8').trim();
    console.log('Using cookie from cookies.txt file');
  } else {
    console.log('No cookies.txt file found. Please create it first with a valid session cookie.');
    process.exit(1);
  }
} catch (err) {
  console.error('Error reading cookies file:', err);
  process.exit(1);
}

// Helper function for making API requests with detailed logging
async function apiRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    }
  };
  
  console.log(`\n${method} ${url}`);
  const logPayload = {
    method,
    url,
    headers: options.headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log(`Request body:`, JSON.stringify(body, null, 2));
    logPayload.body = body;
  }
  
  // Write request details to file
  fs.writeFileSync('./debug-output/request.json', JSON.stringify(logPayload, null, 2));
  
  try {
    const response = await fetch(url, options);
    
    if (response.headers.has('set-cookie')) {
      cookie = response.headers.get('set-cookie');
      console.log('Cookie updated from response');
      fs.writeFileSync('./debug-output/cookie.txt', cookie);
    }
    
    let data = null;
    const headers = {};
    
    // Capture response headers
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    
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
    
    // Write response details to file
    const responseLog = {
      status: response.status,
      headers,
      data
    };
    
    fs.writeFileSync('./debug-output/response.json', JSON.stringify(responseLog, null, 2));
    
    return { status: response.status, data, headers };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    
    // Write error to file
    fs.writeFileSync('./debug-output/error.json', JSON.stringify({
      message: error.message,
      stack: error.stack
    }, null, 2));
    
    return { status: 0, error };
  }
}

// Get a list of projects
async function getProjects() {
  console.log('\n=== FETCHING PROJECTS ===');
  const { status, data } = await apiRequest('GET', '/api/projects');
  
  if (status === 200 && data && data.length > 0) {
    const projectId = data[0].id;
    console.log(`Selected project ID: ${projectId}`);
    console.log(`Project name: ${data[0].name}`);
    return projectId;
  }
  
  console.error('No projects found or unauthorized');
  return null;
}

// Get tasks for a project
async function getTasks(projectId) {
  console.log('\n=== FETCHING TASKS ===');
  
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  // Save tasks data to file
  if (status === 200 && data) {
    fs.writeFileSync('./debug-output/tasks-before.json', JSON.stringify(data, null, 2));
  }
  
  if (status === 200 && data && data.tasks && data.tasks.length > 0) {
    // Try to find a task with origin: success-factor or origin: factor
    const successFactorTask = data.tasks.find(t => 
      t.origin === 'success-factor' || t.origin === 'factor'
    );
    
    const task = successFactorTask || data.tasks[0];
    
    console.log(`Selected task ID: ${task.id}`);
    console.log(`Task text: ${task.text}`);
    console.log(`Current completion state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    return task;
  }
  
  console.error('No tasks found for this project');
  return null;
}

// Toggle task completion state
async function toggleTaskCompletion(projectId, task) {
  console.log('\n=== TOGGLING TASK COMPLETION STATE ===');
  
  console.log(`Current task completion state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Toggle the completion state
  const newCompletionState = !task.completed;
  console.log(`Toggling to: ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Perform the update
  const { status, data } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${task.id}`,
    { completed: newCompletionState }
  );
  
  // Save update result to file
  fs.writeFileSync('./debug-output/task-update-result.json', JSON.stringify({
    status,
    taskId: task.id,
    newState: newCompletionState,
    response: data
  }, null, 2));
  
  if (status === 200) {
    console.log(`Task update successful!`);
    return true;
  }
  
  console.error('Task update failed');
  return false;
}

// Verify task state after update
async function verifyTaskState(projectId, taskId, expectedState) {
  console.log('\n=== VERIFYING TASK STATE PERSISTENCE ===');
  
  // Fetch tasks again to verify the state was persisted
  const { status, data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  // Save tasks data after update to file
  if (status === 200 && data) {
    fs.writeFileSync('./debug-output/tasks-after.json', JSON.stringify(data, null, 2));
  }
  
  if (status === 200 && data && data.tasks) {
    const updatedTask = data.tasks.find(t => t.id === taskId);
    
    if (!updatedTask) {
      console.error('Could not find task in verification query');
      return false;
    }
    
    console.log(`Verified task state: ${updatedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`Expected state: ${expectedState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    // Save verification result to file
    fs.writeFileSync('./debug-output/verification-result.json', JSON.stringify({
      taskId,
      expectedState,
      actualState: updatedTask.completed,
      success: updatedTask.completed === expectedState
    }, null, 2));
    
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
async function captureTaskUpdate() {
  console.log('Starting comprehensive task state transition capture...');
  const startTime = Date.now();
  
  try {
    // Step 1: Get projects
    const projectId = await getProjects();
    if (!projectId) {
      console.error('Failed to get projects, exiting');
      return;
    }
    
    // Step 2: Get tasks
    const task = await getTasks(projectId);
    if (!task) {
      console.error('Failed to get tasks, exiting');
      return;
    }
    
    // Step 3: Toggle task completion
    const updateResult = await toggleTaskCompletion(projectId, task);
    if (!updateResult) {
      console.error('Failed to update task, exiting');
      return;
    }
    
    // Step 4: Verify task state
    await verifyTaskState(projectId, task.id, !task.completed);
    
    // Calculate and log total execution time
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\nCapture completed in ${duration.toFixed(2)} seconds`);
    console.log(`Debug output saved to ./debug-output/`);
  } catch (error) {
    console.error('Script failed with error:', error);
    fs.writeFileSync('./debug-output/script-error.json', JSON.stringify({
      message: error.message,
      stack: error.stack
    }, null, 2));
  }
}

// Run the capture
captureTaskUpdate();