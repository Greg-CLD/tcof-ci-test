/**
 * Success Factor Task Toggle Persistence Test
 * 
 * This comprehensive test verifies that Success Factor task completion states
 * properly persist after being toggled, by:
 * 1. Finding a project
 * 2. Getting a list of Success Factor tasks
 * 3. Toggling one task's completion state
 * 4. Verifying the API response shows the change
 * 5. Getting the tasks again to verify persistence
 * 
 * Run with: node test-sf-persistence.js
 */

const fetch = require('node-fetch');
const { Client } = require('pg');
require('dotenv').config();

// Get the session cookie from the current-session.txt file or create one
async function getSessionCookie() {
  const fs = require('fs');
  try {
    // Try to read from existing file
    if (fs.existsSync('./current-session.txt')) {
      const cookie = fs.readFileSync('./current-session.txt', 'utf8').trim();
      if (cookie) {
        console.log('Using existing session cookie from file');
        return cookie;
      }
    }
    
    // No cookie found or file doesn't exist, need to login
    console.log('No session cookie found, please log in first and save the cookie to current-session.txt');
    process.exit(1);
  } catch (error) {
    console.error('Error reading session cookie:', error);
    process.exit(1);
  }
}

// Make an authenticated API request
async function apiRequest(method, endpoint, body = null) {
  const sessionCookie = await getSessionCookie();
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`${method} ${endpoint}`);
  const response = await fetch(`http://localhost:3000${endpoint}`, options);
  
  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return {
      status: response.status,
      data: data
    };
  } else {
    const text = await response.text();
    return {
      status: response.status,
      text: text
    };
  }
}

// Get a list of projects
async function getProjects() {
  return await apiRequest('GET', '/api/projects');
}

// Get tasks for a project
async function getTasks(projectId) {
  return await apiRequest('GET', `/api/projects/${projectId}/tasks`);
}

// Toggle a task's completion state
async function toggleTask(projectId, taskId, completed) {
  return await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, {
    completed: completed
  });
}

// Database query helper
async function queryDb(sql, params = []) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Main test function
async function runTest() {
  console.log('=== Success Factor Task Toggle Persistence Test ===');
  
  try {
    // Step 1: Get a list of projects
    console.log('\nStep 1: Getting projects...');
    const projectsResponse = await getProjects();
    
    if (projectsResponse.status !== 200 || !projectsResponse.data || !projectsResponse.data.length) {
      console.error('❌ Failed to get projects or no projects found');
      return;
    }
    
    const project = projectsResponse.data[0];
    console.log(`✅ Found project: ${project.name} (${project.id})`);
    
    // Step 2: Get tasks for the project
    console.log('\nStep 2: Getting tasks for project...');
    const tasksResponse = await getTasks(project.id);
    
    if (tasksResponse.status !== 200 || !tasksResponse.data || !tasksResponse.data.length) {
      console.error('❌ Failed to get tasks or no tasks found');
      return;
    }
    
    // Filter for Success Factor tasks only
    const successFactorTasks = tasksResponse.data.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (!successFactorTasks.length) {
      console.error('❌ No Success Factor tasks found for this project');
      return;
    }
    
    console.log(`✅ Found ${successFactorTasks.length} Success Factor tasks`);
    
    // Select the first task for testing
    const taskToToggle = successFactorTasks[0];
    console.log(`\nSelected task for testing: ${taskToToggle.id}`);
    console.log(`Initial state: ${taskToToggle.text.substring(0, 50)}...`);
    console.log(`Completed: ${taskToToggle.completed}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId}`);
    
    // Step 3: Check the task in the database directly
    console.log('\nStep 3: Checking task in database directly...');
    const dbTasks = await queryDb(
      'SELECT id, text, completed, origin, source_id FROM project_tasks WHERE id = $1',
      [taskToToggle.id]
    );
    
    if (!dbTasks.length) {
      console.error('❌ Task not found in database');
      return;
    }
    
    console.log('Database record:');
    console.log(`ID: ${dbTasks[0].id}`);
    console.log(`Completed: ${dbTasks[0].completed}`);
    console.log(`Origin: ${dbTasks[0].origin}`);
    console.log(`Source ID: ${dbTasks[0].source_id}`);
    
    // Step 4: Toggle the task's completion state
    const newCompletionState = !taskToToggle.completed;
    console.log(`\nStep 4: Toggling task completion to: ${newCompletionState}`);
    
    const toggleResponse = await toggleTask(project.id, taskToToggle.id, newCompletionState);
    
    if (toggleResponse.status !== 200 || !toggleResponse.data) {
      console.error(`❌ Failed to toggle task: ${JSON.stringify(toggleResponse)}`);
      return;
    }
    
    console.log('Toggle response:');
    console.log(`Status: ${toggleResponse.status}`);
    console.log(`ID: ${toggleResponse.data.id}`);
    console.log(`Completed: ${toggleResponse.data.completed}`);
    
    if (toggleResponse.data.completed !== newCompletionState) {
      console.error('❌ Task completion state was not updated in the response');
      return;
    }
    
    console.log(`✅ Task completion toggled successfully in API response`);
    
    // Step 5: Verify the change in the database directly
    console.log('\nStep 5: Verifying change in database directly...');
    const updatedDbTasks = await queryDb(
      'SELECT id, text, completed, origin, source_id, updated_at FROM project_tasks WHERE id = $1',
      [taskToToggle.id]
    );
    
    if (!updatedDbTasks.length) {
      console.error('❌ Task not found in database after update');
      return;
    }
    
    console.log('Updated database record:');
    console.log(`ID: ${updatedDbTasks[0].id}`);
    console.log(`Completed: ${updatedDbTasks[0].completed}`);
    console.log(`Origin: ${updatedDbTasks[0].origin}`);
    console.log(`Source ID: ${updatedDbTasks[0].source_id}`);
    console.log(`Updated At: ${updatedDbTasks[0].updated_at}`);
    
    if (updatedDbTasks[0].completed !== newCompletionState) {
      console.error('❌ Task completion state was not persisted in the database');
      return;
    }
    
    console.log(`✅ Task completion state was correctly persisted in database`);
    
    // Step 6: Get tasks again to verify the change through the API
    console.log('\nStep 6: Getting tasks again to verify persistence through API...');
    const verifyTasksResponse = await getTasks(project.id);
    
    if (verifyTasksResponse.status !== 200 || !verifyTasksResponse.data) {
      console.error('❌ Failed to get tasks for verification');
      return;
    }
    
    const verifiedTask = verifyTasksResponse.data.find(task => task.id === taskToToggle.id);
    
    if (!verifiedTask) {
      console.error('❌ Task not found in API response after update');
      return;
    }
    
    console.log('Task from API after update:');
    console.log(`ID: ${verifiedTask.id}`);
    console.log(`Completed: ${verifiedTask.completed}`);
    console.log(`Origin: ${verifiedTask.origin}`);
    
    if (verifiedTask.completed !== newCompletionState) {
      console.error('❌ Task completion state was not persisted in the API response');
      return;
    }
    
    console.log(`✅ Task completion state was correctly persisted and returned via API`);
    console.log('\n✅ SUCCESS: Task toggle and persistence test passed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
runTest();