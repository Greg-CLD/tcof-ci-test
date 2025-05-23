/**
 * Direct Database Fix Script for Task Persistence
 * 
 * This script:
 * 1. Connects directly to PostgreSQL
 * 2. Toggles a task's completion state
 * 3. Verifies the change is persisted in the database
 * 
 * Run with: node fix-project-tasks-schema.js
 */

const { Client } = require('pg');
require('dotenv').config();

// Logging helper
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Connect to the database
async function connectToDatabase() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    log('Connected to database.');
    return client;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Get the database schema for project_tasks table
async function getTableSchema(client) {
  const query = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'project_tasks' 
    ORDER BY ordinal_position
  `;
  
  try {
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Failed to get table schema:', error);
    throw error;
  }
}

// Find a project to work with
async function findProject(client) {
  try {
    const query = 'SELECT id, name FROM projects LIMIT 1';
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      throw new Error('No projects found in database');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to find a project:', error);
    throw error;
  }
}

// Find a Success Factor task to toggle
async function findSuccessFactorTask(client, projectId) {
  try {
    const query = `
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND origin = 'factor'
      LIMIT 1
    `;
    const result = await client.query(query, [projectId]);
    
    if (result.rows.length === 0) {
      throw new Error(`No Success Factor tasks found for project ${projectId}`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to find a Success Factor task:', error);
    throw error;
  }
}

// Toggle a task's completion state directly in the database
async function toggleTaskCompletion(client, taskId, currentState) {
  const newState = !currentState;
  
  try {
    const query = `
      UPDATE project_tasks 
      SET completed = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(query, [newState, taskId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Failed to update task ${taskId}`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Failed to toggle task ${taskId}:`, error);
    throw error;
  }
}

// Check if a task exists in the database by ID
async function getTaskById(client, taskId) {
  try {
    const query = 'SELECT * FROM project_tasks WHERE id = $1';
    const result = await client.query(query, [taskId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Task ${taskId} not found in database`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Failed to get task ${taskId}:`, error);
    throw error;
  }
}

// Create a test task and verify completed state persistence
async function testTaskPersistence() {
  let client;
  
  try {
    // Connect to the database
    client = await connectToDatabase();
    
    // Step 1: Get the database schema
    log('Step 1: Getting database schema for project_tasks table...');
    const schema = await getTableSchema(client);
    
    log(`Found ${schema.length} columns in project_tasks table:`);
    schema.forEach(column => {
      log(`- ${column.column_name} (${column.data_type})`);
    });
    
    // Step 2: Find a project
    log('Step 2: Finding a project to work with...');
    const project = await findProject(client);
    log(`Found project: ${project.name} (${project.id})`);
    
    // Step 3: Find a Success Factor task
    log('Step 3: Finding a Success Factor task to toggle...');
    const task = await findSuccessFactorTask(client, project.id);
    log(`Found task: ${task.text} (${task.id})`);
    log(`Current completion state: ${task.completed}`);
    
    // Step 4: Toggle the task completion state
    log('Step 4: Toggling task completion state...');
    const updatedTask = await toggleTaskCompletion(client, task.id, task.completed);
    log(`Task toggled to: ${updatedTask.completed}`);
    
    // Step 5: Verify the change persisted
    log('Step 5: Verifying the change persisted...');
    const verifiedTask = await getTaskById(client, task.id);
    
    if (verifiedTask.completed === !task.completed) {
      log('✅ SUCCESS: Task state persisted successfully!');
    } else {
      log('❌ FAILURE: Task state did not persist correctly');
      log(`Expected: ${!task.completed}, Actual: ${verifiedTask.completed}`);
    }
    
    // Toggle back to original state for cleanup
    log('Step 6: Toggling task back to original state...');
    const restoredTask = await toggleTaskCompletion(client, task.id, updatedTask.completed);
    log(`Task restored to original state: ${restoredTask.completed}`);
    
    // Final verification
    log('Step 7: Final verification...');
    const finalTask = await getTaskById(client, task.id);
    
    if (finalTask.completed === task.completed) {
      log('✅ SUCCESS: Task restored to original state successfully!');
    } else {
      log('❌ FAILURE: Failed to restore task to original state');
      log(`Expected: ${task.completed}, Actual: ${finalTask.completed}`);
    }
    
    log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    if (client) {
      await client.end();
      log('Database connection closed.');
    }
  }
}

// Run the test
testTaskPersistence();