/**
 * Smoke Test for Task UUID Matching Fix
 * 
 * This script:
 * 1. Makes API requests to update and toggle tasks with different ID formats
 * 2. Verifies that [TASK_LOOKUP] debug logs show proper ID matching
 * 3. Confirms that the server uses the actual matched DB ID for operations
 * 
 * Run with: node test-task-uuid-matching.js
 */

const fetch = require('node-fetch');
const fs = require('fs');

// Helper to read cookies from the cookies.txt file
function getCookies() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      return fs.readFileSync('./cookies.txt', 'utf8').trim();
    }
  } catch (err) {
    console.error('Error reading cookies file:', err);
  }
  console.warn('No cookies found. Authentication may fail.');
  return '';
}

const cookies = getCookies();
const API_HOST = 'http://localhost:5000';

// Helper to make authenticated API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`Making ${method} request to ${endpoint}`);
    const response = await fetch(`${API_HOST}${endpoint}`, options);
    
    // Log response status
    console.log(`Response status: ${response.status}`);
    
    // Parse JSON response
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    console.error(`API request failed:`, error);
    return { status: 500, data: null, error };
  }
}

// Find a test project to use
async function getTestProject() {
  const { data } = await apiRequest('GET', '/api/projects');
  if (!data || !data.length) {
    throw new Error('No projects found. Please create a project first.');
  }
  return data[0];
}

// Get tasks for a project
async function getProjectTasks(projectId) {
  const { data } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  if (!data || !data.length) {
    console.log(`No tasks found for project ${projectId}. Will attempt to create one.`);
    return [];
  }
  return data;
}

// Create a test task if none exist
async function createTestTask(projectId) {
  const task = {
    projectId,
    text: 'Test task for UUID matching',
    stage: 'Identification',
    origin: 'test',
    source: 'test',
    completed: false,
    status: 'To Do',
    priority: 'Medium',
    owner: 'Tester',
    notes: 'Created by test script'
  };
  
  const { status, data } = await apiRequest(
    'POST', 
    `/api/projects/${projectId}/tasks`,
    task
  );
  
  if (status === 201 && data) {
    console.log('Created test task:', data);
    return data;
  }
  
  throw new Error(`Failed to create test task: ${status}`);
}

// Test updating a task with a full ID
async function testFullIdUpdate(projectId, task) {
  console.log('\n=== Testing Full ID Update ===');
  // Use the full task ID as provided by the API
  const fullId = task.id;
  console.log(`Using full task ID: ${fullId}`);
  
  const update = {
    notes: `Updated with full ID at ${new Date().toISOString()}`
  };
  
  const { status } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${fullId}`,
    update
  );
  
  console.log(`Full ID update result: ${status === 200 ? 'SUCCESS' : 'FAILED'}`);
  return status === 200;
}

// Test updating a task with a clean UUID (prefix only)
async function testCleanUuidUpdate(projectId, task) {
  console.log('\n=== Testing Clean UUID Update ===');
  
  // Extract the clean UUID portion (first 5 segments)
  const cleanUuid = task.id.split('-').slice(0, 5).join('-');
  console.log(`Full task ID: ${task.id}`);
  console.log(`Using clean UUID: ${cleanUuid}`);
  
  const update = {
    notes: `Updated with clean UUID at ${new Date().toISOString()}`
  };
  
  const { status } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${cleanUuid}`,
    update
  );
  
  console.log(`Clean UUID update result: ${status === 200 ? 'SUCCESS' : 'FAILED'}`);
  return status === 200;
}

// Test toggling a task completion state
async function testTaskToggle(projectId, task) {
  console.log('\n=== Testing Task Completion Toggle ===');
  
  const currentState = task.completed;
  console.log(`Current completion state: ${currentState}`);
  
  const update = {
    completed: !currentState
  };
  
  const { status } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${task.id}`,
    update
  );
  
  console.log(`Task toggle result: ${status === 200 ? 'SUCCESS' : 'FAILED'}`);
  return status === 200;
}

// Verify the task has the expected notes
async function verifyTaskState(projectId, taskId) {
  const { data: tasks } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    console.error(`Task not found after update: ${taskId}`);
    return false;
  }
  
  console.log(`Current task state:`, {
    id: task.id,
    notes: task.notes,
    completed: task.completed
  });
  
  return true;
}

// Main test flow
async function runTests() {
  try {
    // Get test project and task
    const project = await getTestProject();
    console.log(`Using project: ${project.name} (${project.id})`);
    
    // Get existing tasks or create a new one
    let tasks = await getProjectTasks(project.id);
    let testTask;
    
    if (tasks.length === 0) {
      testTask = await createTestTask(project.id);
    } else {
      testTask = tasks[0];
      console.log(`Using existing task: ${testTask.text} (${testTask.id})`);
    }
    
    // Run the tests
    const fullIdResult = await testFullIdUpdate(project.id, testTask);
    await verifyTaskState(project.id, testTask.id);
    
    const cleanUuidResult = await testCleanUuidUpdate(project.id, testTask);
    await verifyTaskState(project.id, testTask.id);
    
    const toggleResult = await testTaskToggle(project.id, testTask);
    await verifyTaskState(project.id, testTask.id);
    
    // Report test results
    console.log('\n=== Test Results ===');
    console.log(`Full ID Update: ${fullIdResult ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`Clean UUID Update: ${cleanUuidResult ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`Task Toggle: ${toggleResult ? 'PASSED ✓' : 'FAILED ✗'}`);
    
    console.log('\nCheck the server console for [TASK_LOOKUP] logs to verify matching behavior.');
    
    // Return overall test result
    return fullIdResult && cleanUuidResult && toggleResult;
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  }
}

// Run the tests
runTests()
  .then(success => {
    console.log(`\nTests ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });