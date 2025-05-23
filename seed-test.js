/**
 * Direct Test for Success Factor Seeding and Toggle Issues
 * 
 * This script directly tests for and exposes two specific regressions:
 * 1. Duplicate task IDs during Success Factor task seeding
 * 2. Task toggle failures for Success Factor tasks (400 error)
 */

import pg from 'pg';
import fetch from 'node-fetch';

// Config
const DB_URL = process.env.DATABASE_URL;
const API_BASE = 'http://localhost:5000';
const AUTH = {
  username: 'greg@confluity.co.uk',
  password: 'Password123!'
};

// Helpers
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
  if (cookie) headers['Cookie'] = cookie;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  console.log(`${method} ${API_BASE}${endpoint}`);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  // For debugging
  console.log(`Status: ${response.status}`);
  
  let responseData = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  }
  
  return {
    status: response.status,
    headers: response.headers,
    data: responseData
  };
}

async function runTest() {
  try {
    console.log('=== Running Success Factor Seeding & Toggle Regression Test ===\n');
    
    // Step 1: Login to get auth cookie
    console.log('Step 1: Authenticating...');
    const loginResponse = await apiRequest('POST', '/api/auth/login', AUTH);
    
    if (loginResponse.status !== 200) {
      console.error('Authentication failed:', loginResponse.data);
      return;
    }
    
    const authCookie = loginResponse.headers.get('set-cookie');
    console.log('Authentication successful, got cookie\n');
    
    // Step 2: Create a new test project
    console.log('Step 2: Creating test project...');
    const newProject = {
      name: `Regression Test Project ${Date.now()}`,
      organisationId: '867fe8f2-ae5f-451c-872a-0d1582b47c6d',
    };
    
    const createResponse = await apiRequest('POST', '/api/projects', newProject, authCookie);
    
    if (createResponse.status !== 201) {
      console.error('Failed to create project:', createResponse.data);
      return;
    }
    
    const projectId = createResponse.data.id;
    console.log(`Created test project: ${projectId}\n`);
    
    // Step 3: Get tasks with ensure=true to trigger Success Factor seeding
    console.log('Step 3: Testing Success Factor seeding...');
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
    
    // Test for Regression #1: Duplicate task IDs
    const tasks = tasksResponse.data;
    const taskIds = tasks.map(t => t.id);
    const uniqueIds = new Set(taskIds);
    
    console.log(`Total tasks from API: ${tasks.length}`);
    console.log(`Unique task IDs: ${uniqueIds.size}`);
    
    // Check the database directly
    const dbTasks = await query(
      'SELECT id, text, origin, source_id FROM project_tasks WHERE project_id = $1',
      [projectId]
    );
    
    console.log(`Total tasks in database: ${dbTasks.length}`);
    
    // Calculate duplicates
    const duplicateCount = taskIds.length - uniqueIds.size;
    
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
      console.log('No duplicate task IDs found - Expected to find duplicates');
    }
    
    // Step 4: Test Success Factor task toggle (Regression #2)
    console.log('\nStep 4: Testing Success Factor task toggle...');
    
    // Find a Success Factor task to toggle
    const factorTask = tasks.find(t => t.origin === 'factor');
    
    if (!factorTask) {
      console.error('No Success Factor task found to test');
      return;
    }
    
    console.log(`Selected task: ${factorTask.id}`);
    console.log(`Task text: "${factorTask.text}"`);
    console.log(`Current state: completed=${factorTask.completed}`);
    
    // Toggle the task
    const newState = !factorTask.completed;
    console.log(`Attempting to toggle task to completed=${newState}...`);
    
    const toggleResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${factorTask.id}`,
      {
        completed: newState,
        status: newState ? 'Done' : 'To Do'
      },
      authCookie
    );
    
    // Check for Regression #2: Task toggle failure
    if (toggleResponse.status === 400) {
      console.log(`\n=== REGRESSION #2 DETECTED: Task toggle failure (400) ===`);
      console.log('Error response:');
      console.log(JSON.stringify(toggleResponse.data, null, 2));
    } 
    else if (toggleResponse.status !== 200) {
      console.error(`Task toggle failed with status ${toggleResponse.status}:`, toggleResponse.data);
    }
    else {
      console.log('Task toggle succeeded - Expected to fail with 400 error');
    }
    
    // Step 5: Verify if the state change was persisted
    console.log('\nStep 5: Verifying persistence...');
    
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
    
    const updatedTasks = updatedTasksResponse.data;
    const updatedTask = updatedTasks.find(t => t.id === factorTask.id);
    
    if (!updatedTask) {
      console.log('Task not found after update - This indicates persistence issues');
    } else {
      console.log(`Task ${factorTask.id} current state: completed=${updatedTask.completed}`);
      console.log(`Expected state: completed=${newState}`);
      
      if (updatedTask.completed !== newState) {
        console.log('Task state was not persisted correctly');
      } else {
        console.log('Task state was persisted correctly - Expected it to fail');
      }
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('1. Success Factor Seeding:');
    console.log(`   ${duplicateCount > 0 ? '❌ FAILED - Found duplicate tasks' : '✓ PASSED - No duplicates found (unexpected)'}`);
    
    console.log('2. Success Factor Task Toggle:');
    console.log(`   ${toggleResponse.status === 400 ? '❌ FAILED - Got 400 error' : '✓ PASSED - No error (unexpected)'}`);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
runTest();