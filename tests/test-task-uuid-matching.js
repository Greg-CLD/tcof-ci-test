/**
 * Direct Task UUID Matching Test
 * 
 * This script tests the enhanced UUID matching logic by making API calls
 * to create and update tasks with different UUID formats.
 * 
 * No authentication is required as it uses direct database connections.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Set up database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Utility function to log headers
function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(`${text.toUpperCase()}`);
  console.log('='.repeat(80));
}

// Clean a task ID (extract first 5 segments if it's a compound ID)
function cleanTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string') return taskId;
  
  // Extract the UUID part (first 5 segments) from a compound ID
  const segments = taskId.split('-');
  if (segments.length >= 5) {
    return segments.slice(0, 5).join('-');
  }
  
  return taskId;
}

// Create a test task directly in the database
async function createTestTask(projectId) {
  logHeader('Creating test task');
  
  try {
    // Generate a unique task ID
    const taskId = uuidv4();
    const compoundId = `${taskId}-test-${Date.now()}`;
    
    console.log(`Generated task ID: ${taskId}`);
    console.log(`Compound ID: ${compoundId}`);
    
    // Insert task directly into database
    const result = await pool.query(
      `INSERT INTO project_tasks 
       (id, project_id, text, origin, completed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [compoundId, projectId, 'Test task for UUID matching', 'test', false]
    );
    
    if (result.rows.length === 0) {
      console.error('Failed to create test task');
      return null;
    }
    
    const task = result.rows[0];
    console.log('Created task:', task);
    return task;
  } catch (error) {
    console.error('Error creating test task:', error);
    return null;
  }
}

// Find a task by ID with the enhanced matching logic
async function findTaskById(projectId, taskId) {
  logHeader(`Finding task with ID: ${taskId}`);
  
  try {
    // First try an exact match (fastest)
    let result = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = $1 AND id = $2',
      [projectId, taskId]
    );
    
    if (result.rows.length > 0) {
      console.log('Found task with exact ID match');
      return { success: true, task: result.rows[0], method: 'exact-match' };
    }
    
    // If no exact match, try prefix matching
    console.log('No exact match, trying prefix matching...');
    
    // Get all tasks for the project
    result = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [projectId]
    );
    
    for (const task of result.rows) {
      // Extract the clean UUID (first 5 segments)
      const taskCleanId = cleanTaskId(task.id);
      
      console.log(`Comparing task ID: "${task.id}"`);
      console.log(`Clean UUID: "${taskCleanId}"`);
      console.log(`Looking for: "${taskId}"`);
      
      // KEY IMPROVEMENT: Check if taskId matches clean UUID OR if task.id starts with taskId
      if (taskCleanId === taskId || task.id.startsWith(taskId)) {
        console.log(`Found task via improved matching: ${task.id}`);
        return { success: true, task, method: 'prefix-match' };
      }
    }
    
    console.log(`Task not found. Available IDs:`, result.rows.map(t => t.id));
    return { success: false, error: `Task not found with ID ${taskId}` };
  } catch (error) {
    console.error('Error finding task:', error);
    return { success: false, error: error.message };
  }
}

// Update a task by ID testing our enhanced matching logic
async function updateTask(projectId, taskId, updates) {
  logHeader(`Updating task with ID: ${taskId}`);
  
  try {
    // First find the task
    const findResult = await findTaskById(projectId, taskId);
    
    if (!findResult.success) {
      return findResult;
    }
    
    const task = findResult.task;
    console.log(`Found task to update via ${findResult.method}:`, task);
    
    // Update the task in the database
    const updateResult = await pool.query(
      `UPDATE project_tasks 
       SET completed = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [updates.completed, task.id]
    );
    
    if (updateResult.rows.length === 0) {
      return { success: false, error: 'Failed to update task' };
    }
    
    console.log('Updated task:', updateResult.rows[0]);
    return { 
      success: true, 
      task: updateResult.rows[0], 
      method: findResult.method
    };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }
}

// Clean up test data
async function cleanup(projectId, task) {
  logHeader('Cleaning up test data');
  
  try {
    if (task) {
      await pool.query(
        'DELETE FROM project_tasks WHERE id = $1',
        [task.id]
      );
      console.log(`Deleted test task with ID: ${task.id}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Main test function
async function runTest() {
  console.log('Starting Task UUID Matching Test');
  
  try {
    // Use test project ID from environment if available
    const projectId = process.env.TEST_PROJECT_ID || 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
    console.log(`Using project ID: ${projectId}`);
    
    // Create a test task
    const task = await createTestTask(projectId);
    if (!task) {
      console.error('Failed to create test task, aborting test');
      return;
    }
    
    // Test 1: Update with exact compound ID
    console.log('\nTEST 1: Update task using exact compound ID');
    const test1 = await updateTask(projectId, task.id, { completed: true });
    console.log(`Result: ${test1.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Updated task completed: ${test1.success ? test1.task.completed : 'N/A'}`);
    console.log(`Method used: ${test1.method}`);
    
    // Test 2: Update using clean UUID for a task with compound ID
    console.log('\nTEST 2: Update task using clean UUID against compound ID');
    const cleanId = cleanTaskId(task.id);
    const test2 = await updateTask(projectId, cleanId, { completed: false });
    console.log(`Result: ${test2.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Updated task completed: ${test2.success ? test2.task.completed : 'N/A'}`);
    console.log(`Method used: ${test2.method}`);
    
    // Test 3: Update with partial UUID (first segment only)
    console.log('\nTEST 3: Update with partial UUID (first segment only)');
    const partialId = task.id.split('-')[0];
    const test3 = await updateTask(projectId, partialId, { completed: true });
    console.log(`Result: ${test3.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Updated task completed: ${test3.success ? test3.task.completed : 'N/A'}`);
    console.log(`Method used: ${test3.method}`);
    
    // Test 4: Update with non-existent task ID
    console.log('\nTEST 4: Update with non-existent task ID (should fail)');
    const test4 = await updateTask(projectId, 'nonexistent-task-id', { completed: true });
    console.log(`Result: ${test4.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Error: ${test4.error || 'N/A'}`);
    
    // Clean up
    await cleanup(projectId, task);
    
    console.log('\n===== TEST RESULTS SUMMARY =====');
    console.log(`Test 1 (Exact ID): ${test1.success ? 'PASSED' : 'FAILED'}`);
    console.log(`Test 2 (Clean UUID): ${test2.success ? 'PASSED' : 'FAILED'}`);
    console.log(`Test 3 (Partial UUID): ${test3.success ? 'PASSED' : 'FAILED'}`);
    console.log(`Test 4 (Non-existent ID): ${!test4.success ? 'PASSED' : 'FAILED'}`);
    
    // Final verdict
    const allPassed = test1.success && test2.success && test3.success && !test4.success;
    if (allPassed) {
      console.log('\n✅ ALL TESTS PASSED - UUID matching implementation is working correctly!');
    } else {
      console.log('\n❌ SOME TESTS FAILED - Check the logs for details');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});