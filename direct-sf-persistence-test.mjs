/**
 * Success Factor Task Toggle Persistence Test
 * 
 * This script directly tests the task toggle persistence bug:
 * 1. Creates a new project (or uses an existing one)
 * 2. Gets all success factor tasks for the project (with ensure=true)
 * 3. Toggles a task's completion state
 * 4. Verifies the update was successful
 * 5. Gets all tasks again to check if the change persisted
 * 
 * Run with: node direct-sf-persistence-test.mjs
 */

import fetch from 'node-fetch';
import pkg from 'pg';
const { Client } = pkg;

// Configuration
const config = {
  baseUrl: 'http://localhost:5000',
  username: 'greg@confluity.co.uk',
  password: 'tcof123',
  projectName: `SF Test Project ${Date.now()}`
};

// Global session cookie
let sessionCookie = '';
let client;

/**
 * Initialize database connection
 */
async function initDb() {
  // Connect to the database using DATABASE_URL environment variable
  client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to the database');
}

/**
 * Get session cookie for authenticated requests
 */
async function login() {
  console.log('Logging in...');
  
  const response = await fetch(`${config.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: config.username,
      password: config.password
    }),
    redirect: 'manual'
  });
  
  if (response.status === 302 || response.status === 200) {
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      sessionCookie = cookies.split(';')[0];
      console.log('Login successful');
      return true;
    }
  }
  
  console.error('Login failed with status:', response.status);
  return false;
}

/**
 * Create a new test project
 */
async function createProject() {
  console.log(`Creating project: ${config.projectName}`);
  
  const response = await fetch(`${config.baseUrl}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      name: config.projectName
    })
  });
  
  if (response.status === 201) {
    const project = await response.json();
    console.log(`Project created with ID: ${project.id}`);
    return project;
  }
  
  console.error('Failed to create project:', response.status);
  // Try to get an existing project as fallback
  return getExistingProject();
}

/**
 * Get an existing project from the user's projects
 */
async function getExistingProject() {
  console.log('Fetching existing projects...');
  
  const response = await fetch(`${config.baseUrl}/api/projects`, {
    headers: {
      'Cookie': sessionCookie
    }
  });
  
  if (response.status === 200) {
    const projects = await response.json();
    if (projects.length > 0) {
      console.log(`Using existing project: ${projects[0].id}`);
      return projects[0];
    }
  }
  
  throw new Error('No projects available');
}

/**
 * Get all tasks for a project with the ensure=true parameter
 * to make sure Success Factor tasks are created
 */
async function getTasks(projectId, ensure = false) {
  const url = `${config.baseUrl}/api/projects/${projectId}/tasks${ensure ? '?ensure=true' : ''}`;
  console.log(`Fetching tasks from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Cookie': sessionCookie
    }
  });
  
  if (response.status === 200) {
    const tasks = await response.json();
    console.log(`Retrieved ${tasks.length} tasks for project ${projectId}`);
    return tasks;
  }
  
  console.error('Failed to get tasks:', response.status);
  return [];
}

/**
 * Toggle a task's completed state
 */
async function toggleTask(projectId, taskId, completed) {
  console.log(`Toggling task ${taskId} to ${completed ? 'completed' : 'not completed'}`);
  
  const response = await fetch(`${config.baseUrl}/api/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({ completed })
  });
  
  // Log the full API response for detailed debugging
  const responseStatus = response.status;
  const responseBody = await response.json();
  
  console.log('API Response Status:', responseStatus);
  console.log('API Response Body:', JSON.stringify(responseBody, null, 2));
  
  // Look up the task directly in the database for comparison
  const dbTask = await getTaskFromDb(projectId, taskId);
  console.log('Database task state after toggle:', dbTask);
  
  return responseBody;
}

/**
 * Get a task directly from the database
 */
async function getTaskFromDb(projectId, taskId) {
  console.log(`Querying database for task ${taskId} in project ${projectId}`);
  
  try {
    const query = `
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND id = $2
    `;
    
    const result = await client.query(query, [projectId, taskId]);
    
    if (result.rows.length === 0) {
      console.log('Task not found in database');
      
      // Try to find by source_id as a fallback
      console.log('Trying to find task by source_id...');
      const sourceIdQuery = `
        SELECT * FROM project_tasks 
        WHERE project_id = $1 AND source_id = $2
      `;
      
      const sourceIdResult = await client.query(sourceIdQuery, [projectId, taskId]);
      
      if (sourceIdResult.rows.length > 0) {
        console.log('Found task by source_id');
        return sourceIdResult.rows[0];
      }
      
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

/**
 * Find tasks with the same source_id across projects
 */
async function findTasksBySourceIdAcrossProjects(sourceId) {
  try {
    const query = `
      SELECT * FROM project_tasks 
      WHERE source_id = $1
    `;
    
    const result = await client.query(query, [sourceId]);
    console.log(`Found ${result.rows.length} tasks with sourceId ${sourceId} across all projects`);
    
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

/**
 * Run the test to verify task toggle persistence
 */
async function runTest() {
  try {
    // Step 1: Initialize and login
    await initDb();
    const loggedIn = await login();
    if (!loggedIn) throw new Error('Login failed');
    
    // Step 2: Create a project or use an existing one
    const project = await createProject();
    
    // Step 3: Get all tasks with ensure=true to create Success Factor tasks
    const initialTasks = await getTasks(project.id, true);
    
    // Step 4: Find a Success Factor task to toggle
    const successFactorTasks = initialTasks.filter(
      task => task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found');
    }
    
    const taskToToggle = successFactorTasks[0];
    console.log('Success Factor task selected for toggle:');
    console.log(`- ID: ${taskToToggle.id}`);
    console.log(`- Text: ${taskToToggle.text}`);
    console.log(`- Origin: ${taskToToggle.origin}`);
    console.log(`- SourceId: ${taskToToggle.sourceId}`);
    console.log(`- Initial state: ${taskToToggle.completed ? 'completed' : 'not completed'}`);
    
    // Check if this task ID exists in other projects
    const relatedTasks = await findTasksBySourceIdAcrossProjects(
      taskToToggle.sourceId || taskToToggle.id
    );
    
    if (relatedTasks.length > 1) {
      console.log('\n⚠️ WARNING: Found tasks with the same sourceId in multiple projects:');
      relatedTasks.forEach(task => {
        console.log(`- Project ${task.project_id}: Task ${task.id}, completed = ${task.completed}`);
      });
    }
    
    // Step 5: Toggle the task
    const newState = !taskToToggle.completed;
    const updatedTask = await toggleTask(project.id, taskToToggle.id, newState);
    
    // Step 6: Verify the update was successful
    if (updatedTask.completed !== newState) {
      console.error('❌ Task toggle failed - API response shows incorrect state');
      console.error(`Expected: ${newState}, Actual: ${updatedTask.completed}`);
    } else {
      console.log('✅ Task toggle success - API response shows correct state');
    }
    
    // Step 7: Get all tasks again to verify persistence
    console.log('\nVerifying task state persistence...');
    const tasksAfterToggle = await getTasks(project.id);
    
    // Find the toggled task
    const persistedTask = tasksAfterToggle.find(task => task.id === taskToToggle.id);
    
    if (!persistedTask) {
      console.error('❌ Task persistence failed - Task not found after toggle');
    } else if (persistedTask.completed !== newState) {
      console.error('❌ Task persistence failed - Task state did not persist');
      console.error(`Expected: ${newState}, Actual: ${persistedTask.completed}`);
      
      // Additional debugging - check related tasks again
      const relatedTasksAfter = await findTasksBySourceIdAcrossProjects(
        taskToToggle.sourceId || taskToToggle.id
      );
      
      console.log('\nTask states after toggle across all projects:');
      relatedTasksAfter.forEach(task => {
        const isToggled = task.project_id === project.id && task.id === taskToToggle.id;
        console.log(
          `- Project ${task.project_id}: Task ${task.id}, completed = ${task.completed}${isToggled ? ' (toggled task)' : ''}`
        );
      });
      
      console.log('\n🔍 DIAGNOSIS: The most likely reason for this failure is:');
      console.log('When toggling a Success Factor task, the system finds it by sourceId');
      console.log('without properly checking if it belongs to the current project.');
      console.log('This means you might be updating a task in a DIFFERENT project!');
    } else {
      console.log('✅ Task persistence success - Task state correctly persisted');
    }

    // Close the database connection
    await client.end();
    
  } catch (error) {
    console.error('Test failed:', error);
    if (client) await client.end();
  }
}

// Run the test
runTest();