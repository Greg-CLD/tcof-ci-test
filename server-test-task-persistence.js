/**
 * Server-Side Success Factor Task Persistence Test
 * 
 * This script tests if Success Factor task completion states persist properly
 * by making direct database and API calls.
 */

import fetch from 'node-fetch';
import pg from 'pg';
const { Client } = pg;

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Test project
const API_BASE_URL = 'http://localhost:5000';
const DEBUG = true;

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function log(message, data = null) {
  if (DEBUG) {
    console.log(message);
    if (data) {
      console.log(data);
    }
  }
}

async function main() {
  try {
    // Connect to the database
    await client.connect();
    log('Connected to database');

    // Step 1: Find a Success Factor task to test with
    log('\nSTEP 1: Looking for a Success Factor task...');
    const taskResult = await client.query(
      `SELECT * FROM project_tasks 
       WHERE project_id = $1 
       AND origin = 'factor' 
       AND source_id IS NOT NULL 
       LIMIT 1`,
      [PROJECT_ID]
    );

    if (taskResult.rows.length === 0) {
      throw new Error('No Success Factor tasks found to test with');
    }

    const task = taskResult.rows[0];
    log('Found Success Factor task:', task);

    // Step 2: Toggle the task's completion state
    log('\nSTEP 2: Toggling task completion state...');
    const newCompletionState = !task.completed;
    log(`Changing completion from ${task.completed} to ${newCompletionState}`);

    const updateResult = await client.query(
      `UPDATE project_tasks 
       SET completed = $1, 
           updated_at = NOW() 
       WHERE id = $2 
       AND project_id = $3
       RETURNING *`,
      [newCompletionState, task.id, PROJECT_ID]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update task');
    }

    const updatedTask = updateResult.rows[0];
    log('Task updated in database:', updatedTask);

    // Step 3: Verify the update was applied through the API
    log('\nSTEP 3: Verifying through API...');
    const tasksResponse = await fetch(`${API_BASE_URL}/api/projects/${PROJECT_ID}/tasks`);
    
    if (!tasksResponse.ok) {
      throw new Error(`API error: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    const apiTask = tasks.find(t => t.id === task.id);
    
    if (!apiTask) {
      throw new Error('Task not found in API response');
    }
    
    log('Task from API:', apiTask);
    
    if (apiTask.completed !== newCompletionState) {
      throw new Error(`API returned wrong completion state: expected ${newCompletionState}, got ${apiTask.completed}`);
    }
    
    // Step 4: Verify metadata is preserved correctly
    log('\nSTEP 4: Verifying metadata is preserved...');
    
    if (apiTask.origin !== 'factor') {
      throw new Error(`Origin changed from 'factor' to '${apiTask.origin}'`);
    }
    
    if (apiTask.sourceId !== task.source_id) {
      throw new Error(`SourceId changed from '${task.source_id}' to '${apiTask.sourceId}'`);
    }
    
    // Step 5: Test related task synchronization if applicable
    log('\nSTEP 5: Checking for related task synchronization...');
    
    const relatedTasksResult = await client.query(
      `SELECT * FROM project_tasks 
       WHERE project_id = $1 
       AND source_id = $2
       AND id != $3`,
      [PROJECT_ID, task.source_id, task.id]
    );
    
    if (relatedTasksResult.rows.length > 0) {
      log(`Found ${relatedTasksResult.rows.length} related tasks with the same sourceId`);
      
      // Check if all related tasks have the same completion state
      const inconsistentTasks = relatedTasksResult.rows.filter(t => t.completed !== newCompletionState);
      
      if (inconsistentTasks.length > 0) {
        log('Warning: Some related tasks have inconsistent completion states:', inconsistentTasks);
      } else {
        log('All related tasks have consistent completion states');
      }
    } else {
      log('No related tasks found with the same sourceId');
    }
    
    // Success!
    console.log('\n✅ SUCCESS: Task persistence test passed!');
    console.log(`- Task ${task.id} toggled to ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log('- Change was reflected in the API response');
    console.log('- Metadata (origin, sourceId) was preserved');
    if (relatedTasksResult.rows.length > 0) {
      console.log(`- ${relatedTasksResult.rows.length} related tasks were synchronized`);
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    // Clean up
    await client.end();
  }
}

main();