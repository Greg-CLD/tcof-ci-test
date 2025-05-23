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
 * Run with: node test-sf-persistence.js
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

// Set to true to create a new test project, false to use existing project
const CREATE_NEW_PROJECT = false;

/**
 * Initialize database connection
 */
async function initDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  return client;
}

/**
 * Get session cookie for authenticated requests
 */
async function login() {
  try {
    // Use the existing session cookie from file if available
    const response = await fetch('http://localhost:5000/api/auth/user');
    if (response.ok) {
      const userData = await response.json();
      console.log('Logged in as:', userData.username);
      return '';
    } else {
      console.error('Not logged in or session expired');
      throw new Error('Login required');
    }
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

/**
 * Create a new test project
 */
async function createProject() {
  try {
    const projectName = 'Persistence Test Project ' + Date.now();
    
    const response = await fetch('http://localhost:5000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: projectName })
    });
    
    if (!response.ok) {
      throw new Error(`Error creating project: ${response.status} ${response.statusText}`);
    }
    
    const project = await response.json();
    console.log(`Created project: ${project.name} (${project.id})`);
    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Get an existing project from the user's projects
 */
async function getExistingProject() {
  try {
    const response = await fetch('http://localhost:5000/api/projects');
    
    if (!response.ok) {
      throw new Error(`Error getting projects: ${response.status} ${response.statusText}`);
    }
    
    const projects = await response.json();
    
    if (projects.length === 0) {
      throw new Error('No projects found');
    }
    
    // Use the first project
    console.log(`Using existing project: ${projects[0].name} (${projects[0].id})`);
    return projects[0];
  } catch (error) {
    console.error('Error getting existing project:', error);
    throw error;
  }
}

/**
 * Get all tasks for a project with the ensure=true parameter
 * to make sure Success Factor tasks are created
 */
async function getTasks(projectId, ensure = false) {
  try {
    const ensureParam = ensure ? '?ensure=true' : '';
    const response = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks${ensureParam}`);
    
    if (!response.ok) {
      throw new Error(`Error getting tasks: ${response.status} ${response.statusText}`);
    }
    
    const tasks = await response.json();
    console.log(`Retrieved ${tasks.length} tasks for project ${projectId}`);
    
    // Filter out just the success factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    // Log a few examples
    successFactorTasks.slice(0, 5).forEach(task => {
      console.log(`- Task ${task.id}: completed=${task.completed}, sourceId=${task.sourceId}`);
    });
    
    return successFactorTasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    throw error;
  }
}

/**
 * Toggle a task's completed state
 */
async function toggleTask(projectId, taskId, completed) {
  try {
    console.log(`Toggling task ${taskId} to completed=${completed}`);
    
    const response = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Error toggling task: ${response.status} ${response.statusText}`);
    }
    
    const updatedTask = await response.json();
    console.log(`Task toggle response:`, updatedTask);
    
    if (updatedTask.completed === completed) {
      console.log(`✅ Task ${taskId} updated successfully: completed=${updatedTask.completed}`);
      return updatedTask;
    } else {
      console.error(`❌ Task ${taskId} update failed: expected completed=${completed}, got completed=${updatedTask.completed}`);
      throw new Error('Task update failed: values do not match');
    }
  } catch (error) {
    console.error('Error toggling task:', error);
    throw error;
  }
}

/**
 * Get a task directly from the database
 */
async function getTaskFromDb(projectId, taskId) {
  const client = await initDb();
  try {
    const query = `
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND id = $2
    `;
    const result = await client.query(query, [projectId, taskId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Task ${taskId} not found in database`);
    }
    
    return result.rows[0];
  } finally {
    await client.end();
  }
}

/**
 * Find tasks with the same source_id across projects
 */
async function findTasksBySourceIdAcrossProjects(sourceId) {
  const client = await initDb();
  try {
    const query = `
      SELECT id, project_id, text, origin, source_id, completed, stage
      FROM project_tasks 
      WHERE source_id = $1
      ORDER BY project_id, stage
    `;
    const result = await client.query(query, [sourceId]);
    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Find duplicate tasks in a project (same source_id and stage)
 */
async function findDuplicateTasksInProject(projectId) {
  const client = await initDb();
  try {
    const query = `
      SELECT source_id, stage, COUNT(*) as count
      FROM project_tasks
      WHERE project_id = $1 AND source_id IS NOT NULL
      GROUP BY source_id, stage
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `;
    const result = await client.query(query, [projectId]);
    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Run the test to verify task toggle persistence
 */
async function runTest() {
  console.log('=== Success Factor Task Persistence Test ===\n');
  
  try {
    // Get session cookie
    await login();
    
    // Get or create a project
    const project = CREATE_NEW_PROJECT 
      ? await createProject()
      : await getExistingProject();
    
    // Get all tasks with ensure=true to make sure Success Factor tasks exist
    console.log('\nStep 1: Getting all tasks and ensuring Success Factor tasks exist...');
    const tasks = await getTasks(project.id, true);
    
    if (tasks.length === 0) {
      console.error('❌ No Success Factor tasks found. Test cannot continue.');
      return;
    }
    
    // Check for duplicate tasks (by source_id and stage)
    console.log('\nStep 2: Checking for duplicate tasks...');
    const duplicates = await findDuplicateTasksInProject(project.id);
    
    if (duplicates.length > 0) {
      console.warn(`⚠️ Found ${duplicates.length} sets of duplicate tasks:`);
      duplicates.forEach(dup => {
        console.warn(`- sourceId=${dup.source_id}, stage=${dup.stage}: ${dup.count} duplicates`);
      });
    } else {
      console.log('✅ No duplicate tasks found');
    }
    
    // Select a task to toggle (use the first one)
    const taskToToggle = tasks[0];
    console.log(`\nStep 3: Selected task to toggle: ${taskToToggle.id}`);
    console.log(`- Text: ${taskToToggle.text}`);
    console.log(`- Current state: completed=${taskToToggle.completed}`);
    console.log(`- Origin: ${taskToToggle.origin}`);
    console.log(`- Source ID: ${taskToToggle.sourceId}`);
    
    // Get the task from the database to verify its initial state
    console.log('\nStep 4: Checking initial task state in database...');
    const initialDbTask = await getTaskFromDb(project.id, taskToToggle.id);
    console.log('Database task state:');
    console.log(`- ID: ${initialDbTask.id}`);
    console.log(`- Completed: ${initialDbTask.completed}`);
    console.log(`- Origin: ${initialDbTask.origin}`);
    console.log(`- Source ID: ${initialDbTask.source_id}`);
    
    // Toggle the task (invert its current completion state)
    const newState = !taskToToggle.completed;
    console.log(`\nStep 5: Toggling task completion from ${taskToToggle.completed} to ${newState}...`);
    const toggledTask = await toggleTask(project.id, taskToToggle.id, newState);
    
    // Verify the task state in the database after the toggle
    console.log('\nStep 6: Verifying task state in database after toggle...');
    const updatedDbTask = await getTaskFromDb(project.id, taskToToggle.id);
    console.log('Database task state after toggle:');
    console.log(`- ID: ${updatedDbTask.id}`);
    console.log(`- Completed: ${updatedDbTask.completed}`);
    console.log(`- Updated at: ${updatedDbTask.updated_at}`);
    
    if (updatedDbTask.completed === newState) {
      console.log('✅ Database state matches the requested state');
    } else {
      console.error(`❌ Database state (${updatedDbTask.completed}) does not match requested state (${newState})`);
    }
    
    // Get tasks again to verify persistence through the API
    console.log('\nStep 7: Getting tasks again to verify persistence via API...');
    const tasksAfterToggle = await getTasks(project.id);
    
    // Find the same task in the new results
    const persistedTask = tasksAfterToggle.find(task => task.id === taskToToggle.id);
    
    if (!persistedTask) {
      console.error(`❌ Task ${taskToToggle.id} not found in tasks after toggle`);
    } else {
      console.log(`API task state after toggle: completed=${persistedTask.completed}`);
      
      if (persistedTask.completed === newState) {
        console.log('✅ Task persistence SUCCESSFUL: API response shows correct state');
      } else {
        console.error(`❌ Task persistence FAILED: API response shows completed=${persistedTask.completed}, expected ${newState}`);
      }
    }
    
    console.log('\n=== Test Complete ===');
    
    if (updatedDbTask.completed === newState && persistedTask && persistedTask.completed === newState) {
      console.log('🎉 SUCCESS: Task toggle persistence is working correctly! The fix is effective.');
    } else {
      console.error('❌ FAILURE: Task toggle persistence is still not working correctly.');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

runTest();