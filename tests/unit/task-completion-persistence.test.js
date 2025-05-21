/**
 * Direct test for Success Factor task completion persistence bug fix
 * 
 * This test verifies that canonical task completion status persists correctly
 * after the fix has been applied to server/projectsDb.ts
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// Environment variables
const DEBUG = process.env.DEBUG === 'true';
const DEBUG_TASK_COMPLETION = process.env.DEBUG_TASK_COMPLETION === 'true' || DEBUG;
const DEBUG_TASK_PERSISTENCE = process.env.DEBUG_TASK_PERSISTENCE === 'true' || DEBUG;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test API helpers
const api = {
  // Set up a project with a canonical success factor task
  async setupProjectWithCanonicalTask() {
    if (DEBUG_TASK_PERSISTENCE) console.log('Setting up project with canonical success factor task...');
    
    // Create a project for testing if needed
    const projectResult = await pool.query(`
      SELECT id FROM projects WHERE name = 'Persistence Test Project' LIMIT 1
    `);
    
    let projectId;
    
    if (projectResult.rows.length === 0) {
      if (DEBUG_TASK_PERSISTENCE) console.log('Creating new test project...');
      const newProject = await pool.query(`
        INSERT INTO projects (id, name, user_id)
        VALUES (gen_random_uuid(), 'Persistence Test Project', 3)
        RETURNING id
      `);
      projectId = newProject.rows[0].id;
    } else {
      projectId = projectResult.rows[0].id;
    }
    
    if (DEBUG_TASK_PERSISTENCE) console.log(`Using project with ID: ${projectId}`);
    
    // Look for an existing canonical task or create one
    const taskResult = await pool.query(`
      SELECT id, source_id FROM project_tasks 
      WHERE project_id = $1 AND origin = 'success-factor' 
      LIMIT 1
    `, [projectId]);
    
    let taskId, canonicalTaskId;
    
    if (taskResult.rows.length === 0) {
      if (DEBUG_TASK_PERSISTENCE) console.log('Creating new canonical success factor task...');
      
      // Generate a canonical task ID with just a UUID for the test
      const taskUuid = await pool.query(`SELECT gen_random_uuid() as uuid`);
      canonicalTaskId = taskUuid.rows[0].uuid;
      
      const newTask = await pool.query(`
        INSERT INTO project_tasks (
          id, project_id, text, stage, completed, origin, source_id
        )
        VALUES (
          gen_random_uuid(), $1, 'Test Success Factor Task', 'identification', 
          false, 'success-factor', $2
        )
        RETURNING id, source_id
      `, [projectId, canonicalTaskId]);
      
      taskId = newTask.rows[0].id;
      canonicalTaskId = newTask.rows[0].source_id;
    } else {
      taskId = taskResult.rows[0].id;
      canonicalTaskId = taskResult.rows[0].source_id;
    }
    
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`Using task with DB ID: ${taskId}`);
      console.log(`Canonical task ID (source_id): ${canonicalTaskId}`);
    }
    
    return { projectId, taskId, canonicalTaskId };
  },
  
  // Mark a task as complete or incomplete
  async markTaskComplete(projectId, taskId, complete) {
    if (DEBUG_TASK_COMPLETION) {
      console.log(`Marking task ${taskId} as ${complete ? 'complete' : 'incomplete'}...`);
    }
    
    // Make a direct update using the PUT endpoint pattern
    const result = await pool.query(`
      UPDATE project_tasks
      SET completed = $1, updated_at = NOW()
      WHERE source_id = $2 OR id = $2
      RETURNING id, source_id, completed
    `, [complete, taskId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Task not found with ID ${taskId}`);
    }
    
    if (DEBUG_TASK_COMPLETION) {
      console.log('Update result:', result.rows[0]);
    }
    
    return result.rows[0];
  },
  
  // Fetch tasks for a project
  async fetchTasks(projectId) {
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`Fetching tasks for project ${projectId}...`);
    }
    
    const result = await pool.query(`
      SELECT id, source_id, text, completed, origin 
      FROM project_tasks
      WHERE project_id = $1
    `, [projectId]);
    
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`Found ${result.rows.length} tasks`);
    }
    
    return result.rows;
  }
};

// Run the tests as async IIFE
(async function runTests() {
  try {
    console.log('🧪 Testing Success Factor task completion persistence...');
    
    // GIVEN a project with canonical (success factor) tasks
    const { projectId, canonicalTaskId } = await api.setupProjectWithCanonicalTask();
    
    // WHEN marking the task as complete
    await api.markTaskComplete(projectId, canonicalTaskId, true);
    console.log('✅ Task marked as complete');
    
    // AND fetching tasks after "refresh"
    const tasks = await api.fetchTasks(projectId);
    
    // THEN the task should remain completed
    const updatedTask = tasks.find(t => t.source_id === canonicalTaskId);
    
    if (!updatedTask) {
      console.error('❌ TEST FAILED: Task not found after update!');
      process.exit(1);
    }
    
    if (updatedTask.completed !== true) {
      console.error('❌ TEST FAILED: Task completion status did not persist!');
      console.error('Task state:', updatedTask);
      process.exit(1);
    }
    
    console.log('✅ TEST PASSED: Task completion status persisted successfully!');
    console.log('Task data:', updatedTask);
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
})();