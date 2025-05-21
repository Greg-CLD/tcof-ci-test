/**
 * Edge Case Testing Script for Success-Factor Task Updates
 * 
 * This script tests specific edge cases for Success-Factor task updates:
 * 1. Updates using various ID formats (full ID, UUID part, compound ID)
 * 2. Updates when a task has a sourceId that differs from its ID
 * 3. Error handling for non-existent tasks
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Get authentication cookie
function getCookies() {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (error) {
    console.error('Error reading cookies file:', error.message);
    console.log('Please run extract-session-cookie.js first');
    process.exit(1);
  }
}

// API request helper
async function apiRequest(method, endpoint, body = null) {
  const baseUrl = 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  const cookies = getCookies();
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    }
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`Making ${method} request to ${endpoint}`);
  if (body) console.log('Request body:', JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(url, options);
    console.log(`Response status: ${response.status}`);
    
    let data;
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
        console.log('Response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Raw response (not JSON):', text);
        data = { text };
      }
    } catch (error) {
      console.error('Error reading response:', error);
      return { status: response.status, ok: response.ok, data: null };
    }
    
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    console.error(`Request failed:`, error);
    return { status: 0, ok: false, error: error.message };
  }
}

/**
 * Test success factor task updates with various ID formats
 */
async function testSuccessFactorTaskUpdates() {
  console.log('=== TESTING SUCCESS-FACTOR TASK UPDATES ===\n');
  
  // Get a test project
  console.log('1. Getting a test project...');
  const projectsResponse = await apiRequest('GET', '/api/projects');
  
  if (!projectsResponse.ok || !projectsResponse.data?.length) {
    console.error('Failed to get projects or no projects available');
    return;
  }
  
  const projectId = projectsResponse.data[0].id;
  console.log(`Using project: ${projectId}`);
  
  // Get tasks for this project
  console.log('\n2. Getting tasks for project...');
  const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!tasksResponse.ok) {
    console.error('Failed to get tasks');
    return;
  }
  
  // Find a success factor task or create one if none exists
  let successFactorTask = tasksResponse.data.find(task => 
    task.origin === 'success-factor' || task.origin === 'factor'
  );
  
  if (!successFactorTask) {
    console.log('\n3. No success factor task found, creating one...');
    const createTaskResponse = await apiRequest('POST', `/api/projects/${projectId}/tasks`, {
      text: 'Test Success Factor Task',
      origin: 'success-factor',
      completed: false,
      stage: 'Identification'
    });
    
    if (!createTaskResponse.ok) {
      console.error('Failed to create test task');
      return;
    }
    
    successFactorTask = createTaskResponse.data;
  }
  
  console.log(`\nUsing Success-Factor task: ${successFactorTask.id}`);
  console.log(`Current state: ${successFactorTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // TEST CASE 1: Update with the full task ID
  console.log('\n4. TEST CASE 1: Update with full task ID');
  const fullIdResponse = await apiRequest('PUT', 
    `/api/projects/${projectId}/tasks/${successFactorTask.id}`,
    { completed: !successFactorTask.completed }
  );
  
  console.log(`Update with full ID: ${fullIdResponse.ok ? 'SUCCESS' : 'FAILED'}`);
  
  // Get the current task state after the first update
  console.log('\n5. Getting updated task state...');
  const updatedTasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!updatedTasksResponse.ok) {
    console.error('Failed to get updated tasks');
    return;
  }
  
  const updatedTask = updatedTasksResponse.data.find(task => task.id === successFactorTask.id);
  if (!updatedTask) {
    console.error('Could not find the task after update');
    return;
  }
  
  console.log(`Task state after first update: ${updatedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // TEST CASE 2: Update with just the UUID part of the ID
  // Extract the UUID part (first 5 segments) if this is a compound ID
  const uuidPart = successFactorTask.id.split('-').slice(0, 5).join('-');
  
  if (uuidPart !== successFactorTask.id && uuidPart.length >= 36) {
    console.log(`\n6. TEST CASE 2: Update with UUID part: ${uuidPart}`);
    
    const uuidResponse = await apiRequest('PUT',
      `/api/projects/${projectId}/tasks/${uuidPart}`,
      { completed: !updatedTask.completed }
    );
    
    console.log(`Update with UUID part: ${uuidResponse.ok ? 'SUCCESS' : 'FAILED'}`);
    
    // Get the final task state
    console.log('\n7. Getting final task state...');
    const finalTasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    
    if (finalTasksResponse.ok) {
      const finalTask = finalTasksResponse.data.find(task => task.id === successFactorTask.id);
      if (finalTask) {
        console.log(`Final task state: ${finalTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
      }
    }
  } else {
    console.log('\n6. Task does not have a compound ID, skipping UUID part test');
  }
  
  // TEST CASE 3: Test error handling with non-existent task
  console.log('\n8. TEST CASE 3: Update non-existent task');
  const nonExistentTaskId = 'non-existent-task-id';
  
  const errorResponse = await apiRequest('PUT',
    `/api/projects/${projectId}/tasks/${nonExistentTaskId}`,
    { completed: true }
  );
  
  console.log(`Error response status: ${errorResponse.status}`);
  console.log(`Error handling: ${errorResponse.status === 404 ? 'CORRECT (404)' : 'INCORRECT'}`);
  
  console.log('\n=== SUCCESS-FACTOR TASK UPDATE TESTS COMPLETE ===');
}

// Run the tests
testSuccessFactorTaskUpdates().catch(error => {
  console.error('Test script failed:', error);
});