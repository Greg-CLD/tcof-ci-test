/**
 * Direct Task Update Test
 * 
 * This script directly tests the task update functionality to verify
 * our new [TASK_LOOKUP] debug logging is working correctly.
 * 
 * Run with: node direct-task-update-test.js
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Target project ID (change if needed)
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Helper for API requests with authentication
async function apiRequest(method, endpoint, body = null) {
  // Try to load cookie from file if exists
  let cookie = '';
  try {
    cookie = fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (err) {
    console.log('No cookies.txt file found - requests may fail if authentication is required');
  }
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`API ${method} ${endpoint}`);
  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  return response;
}

async function findOrCreateTestTask() {
  console.log(`Looking for tasks in project ${PROJECT_ID}...`);
  const tasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
  
  if (!tasksResponse.ok) {
    console.error(`Failed to get tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    throw new Error(`API error: ${tasksResponse.status}`);
  }
  
  const tasks = await tasksResponse.json();
  
  if (tasks && tasks.length > 0) {
    console.log(`Found ${tasks.length} existing tasks`);
    return tasks[0]; // Return the first task
  }
  
  // If no tasks exist, create a test task
  console.log('No tasks found, creating a test task...');
  const newTask = {
    text: 'Test task for TASK_LOOKUP debugging',
    stage: 'Identification',
    origin: 'test',
    source: 'test',
    completed: false
  };
  
  const createResponse = await apiRequest('POST', `/api/projects/${PROJECT_ID}/tasks`, newTask);
  
  if (!createResponse.ok) {
    console.error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
    throw new Error(`API error: ${createResponse.status}`);
  }
  
  return await createResponse.json();
}

async function updateTask(task) {
  console.log(`Updating task ${task.id}...`);
  const updateData = {
    completed: !task.completed
  };
  
  const updateResponse = await apiRequest(
    'PUT', 
    `/api/projects/${PROJECT_ID}/tasks/${task.id}`, 
    updateData
  );
  
  if (!updateResponse.ok) {
    console.error(`Failed to update task: ${updateResponse.status} ${updateResponse.statusText}`);
    throw new Error(`API error: ${updateResponse.status}`);
  }
  
  console.log('Task updated successfully');
  return await updateResponse.json();
}

async function updateTaskWithCleanUuid(task) {
  if (!task.id.includes('-')) {
    console.log('Task ID is not a UUID, skipping clean UUID test');
    return null;
  }
  
  // Extract the clean UUID (first 5 segments)
  const cleanUuid = task.id.split('-').slice(0, 5).join('-');
  console.log(`Testing with clean UUID: ${cleanUuid}`);
  
  const updateData = {
    completed: !task.completed
  };
  
  const updateResponse = await apiRequest(
    'PUT', 
    `/api/projects/${PROJECT_ID}/tasks/${cleanUuid}`, 
    updateData
  );
  
  if (!updateResponse.ok) {
    console.error(`Failed to update task with clean UUID: ${updateResponse.status} ${updateResponse.statusText}`);
    throw new Error(`API error: ${updateResponse.status}`);
  }
  
  console.log('Task updated successfully using clean UUID');
  return await updateResponse.json();
}

async function runTest() {
  console.log('========================================================');
  console.log('Testing TASK_LOOKUP Debug Output');
  console.log('========================================================');
  
  try {
    // Find or create a test task
    const task = await findOrCreateTestTask();
    console.log(`Test task: ${task.text} (${task.id})`);
    
    // Test 1: Update with exact ID
    console.log('\nTest 1: Update task with exact ID');
    console.log('This should log [TASK_LOOKUP] with matchedVia: "exact"');
    const updatedTask = await updateTask(task);
    
    // Test 2: Update with clean UUID
    console.log('\nTest 2: Update task with clean UUID');
    console.log('This should log [TASK_LOOKUP] with matchedVia: "prefix"');
    await updateTaskWithCleanUuid(updatedTask);
    
    console.log('\n✅ Tests completed!');
    console.log('Check the server console for [TASK_LOOKUP] debug output');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();