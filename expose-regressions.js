/**
 * Direct Script to Expose Success Factor Regressions
 * 
 * This script directly:
 * 1. Creates a new project
 * 2. Tests for duplicate task IDs during Success Factor task seeding
 * 3. Tests for 400 errors when toggling Success Factor tasks
 */

import fetch from 'node-fetch';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Config
const API_BASE = 'http://localhost:5000';
const DB_URL = process.env.DATABASE_URL;

// Helper functions
async function query(sql, params = []) {
  const client = new pg.Client(DB_URL);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function apiRequest(method, endpoint, body = null, cookie = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  console.log(`${method} ${endpoint}`);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  // For debugging
  console.log(`Status: ${response.status}`);
  
  let responseData = null;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    }
  } catch (error) {
    console.error('Error parsing JSON response:', error);
  }
  
  return {
    status: response.status,
    headers: response.headers,
    data: responseData
  };
}

async function runTest() {
  console.log('=== REGRESSION TEST: Success Factor Seeding & Task Toggle ===\n');
  
  // Step 1: Login to get auth cookie
  console.log('Step 1: Authentication...');
  const loginResponse = await apiRequest('POST', '/api/auth/login', {
    username: 'greg@confluity.co.uk',
    password: 'Password123!'
  });
  
  if (loginResponse.status !== 200) {
    console.error('Authentication failed:', loginResponse.data);
    return;
  }
  
  const authCookie = loginResponse.headers.get('set-cookie');
  console.log('Authentication successful\n');
  
  // Step 2: Create a new test project
  console.log('Step 2: Creating test project...');
  const newProject = {
    name: `Regression Test Project ${Date.now()}`,
    organisationId: '867fe8f2-ae5f-451c-872a-0d1582b47c6d'
  };
  
  const createResponse = await apiRequest('POST', '/api/projects', newProject, authCookie);
  
  if (createResponse.status !== 201) {
    console.error('Failed to create project:', createResponse.data);
    return;
  }
  
  const projectId = createResponse.data.id;
  console.log(`Created test project: ${projectId} (${newProject.name})\n`);
  
  // Step 3: Test Success Factor seeding for duplicate IDs
  console.log('Step 3: Testing Success Factor seeding for duplicate task IDs...');
  console.log(`Requesting tasks with ensure=true for project ${projectId}...`);
  
  const tasksResponse = await apiRequest(
    'GET',
    `/api/projects/${projectId}/tasks?ensure=true`, 
    null,
    authCookie
  );
  
  if (tasksResponse.status !== 200) {
    console.error('Failed to get tasks:', tasksResponse.data);
    return;
  }
  
  // Check for duplicate task IDs
  const tasks = tasksResponse.data;
  const taskIds = tasks.map(t => t.id);
  const uniqueTaskIds = new Set(taskIds);
  
  console.log(`Total tasks from API: ${tasks.length}`);
  console.log(`Unique task IDs: ${uniqueTaskIds.size}`);
  console.log(`Success Factor tasks: ${tasks.filter(t => t.origin === 'factor').length}`);
  
  // Calculate duplicate count
  const duplicateCount = taskIds.length - uniqueTaskIds.size;
  
  if (duplicateCount > 0) {
    console.log(`\n=== REGRESSION #1 DETECTED: ${duplicateCount} duplicate task IDs ===`);
    
    // Find and display the duplicates
    const idCounts = {};
    taskIds.forEach(id => {
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    
    const duplicates = Object.entries(idCounts)
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({
        id,
        count,
        tasks: tasks.filter(t => t.id === id)
      }));
    
    console.log('\nDuplicate task details:');
    duplicates.forEach(({ id, count, tasks }) => {
      console.log(`* ID: ${id} appears ${count} times:`);
      tasks.forEach(task => {
        console.log(`  - "${task.text}" (origin: ${task.origin}, sourceId: ${task.sourceId})`);
      });
    });
  } else {
    console.log('No duplicate task IDs found (unexpected)');
  }
  
  // Step 4: Test Success Factor task toggle
  console.log('\nStep 4: Testing Success Factor task toggle (expecting 400 error)...');
  
  // Get all tasks for the project
  const allTasksResponse = await apiRequest(
    'GET',
    `/api/projects/${projectId}/tasks`,
    null, 
    authCookie
  );
  
  // Find a Success Factor task to toggle
  const factorTasks = allTasksResponse.data.filter(t => t.origin === 'factor');
  
  if (factorTasks.length === 0) {
    console.error('No Success Factor tasks found to test');
    return;
  }
  
  const factorTask = factorTasks[0];
  console.log(`Selected task: ${factorTask.id}`);
  console.log(`Task text: "${factorTask.text}"`);
  console.log(`Current state: completed=${factorTask.completed}`);
  
  // Toggle the task
  const toggleResponse = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${factorTask.id}`,
    {
      completed: !factorTask.completed,
      status: !factorTask.completed ? 'Done' : 'To Do'
    },
    authCookie
  );
  
  // Check for REGRESSION #2: Task toggle failure (400 error)
  if (toggleResponse.status === 400) {
    console.log('\n=== REGRESSION #2 DETECTED: Task toggle failure (400 error) ===');
    console.log('Error details:');
    console.log(JSON.stringify(toggleResponse.data, null, 2));
  } 
  else if (toggleResponse.status !== 200) {
    console.error(`Task toggle failed with unexpected status ${toggleResponse.status}:`, toggleResponse.data);
  }
  else {
    console.log('Task toggle succeeded (unexpected - should have failed with 400)');
  }
  
  // Step 5: Test if state was persisted anyway (regardless of error)
  console.log('\nStep 5: Checking if task state change was persisted...');
  
  const updatedTasksResponse = await apiRequest(
    'GET',
    `/api/projects/${projectId}/tasks`,
    null, 
    authCookie
  );
  
  if (updatedTasksResponse.status !== 200) {
    console.error('Failed to get updated tasks:', updatedTasksResponse.data);
    return;
  }
  
  const updatedTask = updatedTasksResponse.data.find(t => t.id === factorTask.id);
  
  if (!updatedTask) {
    console.log('Task not found after update - This indicates persistence issues');
  } else {
    console.log(`Task ${factorTask.id} state after toggle attempt: completed=${updatedTask.completed}`);
    console.log(`Expected state (if working): completed=${!factorTask.completed}`);
    
    if (updatedTask.completed === !factorTask.completed) {
      console.log('Surprise: Task state was successfully persisted (unexpected)');
    } else {
      console.log('Task state was NOT persisted as expected due to the error');
    }
  }
  
  // Compare with a custom task toggle (control test)
  console.log('\nStep 6: Testing custom task toggle for comparison...');
  
  // Create a custom task
  const customTaskResponse = await apiRequest(
    'POST',
    `/api/projects/${projectId}/tasks`,
    {
      text: `Test Custom Task ${Date.now()}`,
      stage: 'identification',
      origin: 'custom',
      completed: false,
      status: 'To Do'
    },
    authCookie
  );
  
  if (customTaskResponse.status !== 201) {
    console.error('Failed to create custom task:', customTaskResponse.data);
    return;
  }
  
  const customTask = customTaskResponse.data;
  console.log(`Created custom task: ${customTask.id}`);
  
  // Toggle the custom task
  const customToggleResponse = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${customTask.id}`,
    {
      completed: true,
      status: 'Done'
    },
    authCookie
  );
  
  if (customToggleResponse.status !== 200) {
    console.log(`Custom task toggle failed with status ${customToggleResponse.status}`);
    console.log(JSON.stringify(customToggleResponse.data, null, 2));
  } else {
    console.log('Custom task toggle succeeded as expected');
    
    // Verify custom task persistence
    const finalTasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks`,
      null,
      authCookie
    );
    
    const finalCustomTask = finalTasksResponse.data.find(t => t.id === customTask.id);
    
    if (finalCustomTask && finalCustomTask.completed === true) {
      console.log('Custom task state successfully persisted (expected)');
    } else {
      console.log('Custom task state was NOT persisted (unexpected)');
    }
  }
  
  // Summary
  console.log('\n=== REGRESSION TEST SUMMARY ===');
  console.log(`1. Duplicate Task IDs: ${duplicateCount > 0 ? 'DETECTED ✓' : 'Not detected (unexpected)'}`);
  console.log(`2. Task Toggle Failure: ${toggleResponse.status === 400 ? 'DETECTED ✓' : 'Not detected (unexpected)'}`);
  console.log('\nThese regressions confirm the two issues we need to fix:');
  console.log('1. Success Factor seeding creates duplicate tasks');
  console.log('2. Success Factor task toggle fails with 400 error');
}

runTest().catch(error => console.error('Test error:', error));