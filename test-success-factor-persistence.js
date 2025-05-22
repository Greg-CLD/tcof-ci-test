/**
 * Success Factor Task Persistence Verification Test
 * 
 * This script directly tests if Success Factor tasks persist their state changes
 * by making API calls with proper authentication from an active session.
 * 
 * This is a server-side test that:
 * 1. Gets a project ID
 * 2. Gets tasks for that project
 * 3. Finds a Success Factor task
 * 4. Toggles its completion state
 * 5. Verifies the new state is correctly persisted
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://0.0.0.0:5000';
let cookie = '';

// Try to read the session cookie from a file
try {
  if (fs.existsSync('./current-session.txt')) {
    cookie = fs.readFileSync('./current-session.txt', 'utf8').trim();
    console.log('Using session cookie from current-session.txt');
  } else {
    console.log('No session cookie file found. Use extract-current-session.js to create one.');
  }
} catch (err) {
  console.error('Error reading session cookie:', err);
}

// Helper function for API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (cookie) {
    options.headers['Cookie'] = cookie;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`\n${method} ${endpoint}`);
  if (body) console.log('Request body:', JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Update cookie if returned
    if (response.headers.has('set-cookie')) {
      cookie = response.headers.get('set-cookie');
    }
    
    // Parse the response
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = null;
    }
    
    console.log(`Response status: ${response.status}`);
    if (responseData) {
      console.log('Response data:', JSON.stringify(responseData, null, 2));
    }
    
    return { status: response.status, data: responseData };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
}

// Main test function
async function testSuccessFactorTaskPersistence() {
  console.log('=== SUCCESS FACTOR TASK PERSISTENCE TEST ===');
  try {
    // Step 1: Get a project ID
    console.log('\nStep 1: Getting projects...');
    const projectsResponse = await apiRequest('GET', '/api/projects');
    
    if (!projectsResponse.data || projectsResponse.data.length === 0) {
      throw new Error('No projects found. Please create a project first.');
    }
    
    const projectId = projectsResponse.data[0].id;
    console.log(`Selected project: ${projectsResponse.data[0].name} (ID: ${projectId})`);
    
    // Step 2: Get tasks for this project
    console.log('\nStep 2: Getting tasks for project...');
    const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    
    if (!tasksResponse.data || !tasksResponse.data.length) {
      throw new Error('No tasks found for this project.');
    }
    
    console.log(`Found ${tasksResponse.data.length} tasks in the project.`);
    
    // Step 3: Find a Success Factor task
    console.log('\nStep 3: Finding a Success Factor task...');
    const successFactorTasks = tasksResponse.data.filter(
      task => task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found. Please add Success Factors to this project.');
    }
    
    const testTask = successFactorTasks[0];
    console.log(`Selected Success Factor task: "${testTask.text}" (ID: ${testTask.id})`);
    console.log(`Original state: ${testTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    // Step 4: Toggle the task's completion state
    console.log('\nStep 4: Toggling task completion state...');
    const newState = !testTask.completed;
    console.log(`Setting new state to: ${newState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${testTask.id}`,
      { completed: newState }
    );
    
    if (updateResponse.status !== 200) {
      throw new Error(`Failed to update task. Status: ${updateResponse.status}`);
    }
    
    // Step 5: Verify the state was correctly persisted
    console.log('\nStep 5: Verifying state persistence...');
    const verifyResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    
    const updatedTask = verifyResponse.data.find(task => task.id === testTask.id);
    
    if (!updatedTask) {
      throw new Error('Could not find the task after update.');
    }
    
    console.log(`Verified task state: ${updatedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log(`Expected state: ${newState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    
    if (updatedTask.completed === newState) {
      console.log('\n✅ SUCCESS: Task state was correctly persisted!');
    } else {
      console.log('\n❌ FAILURE: Task state was not correctly persisted.');
    }
    
    // Step 6: Clean up by toggling back to original state
    console.log('\nStep 6: Restoring original state...');
    await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${testTask.id}`,
      { completed: testTask.completed }
    );
    
    console.log('\nTest completed.');
    
  } catch (error) {
    console.error(`\nTest failed: ${error.message}`);
  }
}

// Run the test
testSuccessFactorTaskPersistence();