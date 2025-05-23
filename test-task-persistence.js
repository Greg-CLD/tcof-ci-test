/**
 * Task Persistence Test Script
 * 
 * This script directly tests task persistence through our standalone server.
 * It demonstrates how to toggle a task's completion status and verify
 * that the changes are properly persisted in the database.
 */

const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file if present

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Fetch a project's tasks directly from the database
 */
async function getTasksFromDb(projectId) {
  try {
    const result = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [projectId]
    );
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch tasks from database:', error);
    throw error;
  }
}

/**
 * Update a task's completion status via direct API call
 */
async function toggleTaskCompletion(projectId, taskId, completed) {
  try {
    // The port where the standalone server is running
    const PORT = process.env.STANDALONE_PORT || 3100;
    
    // Make a direct PUT request to our standalone server
    const response = await fetch(
      `http://localhost:${PORT}/api/projects/${projectId}/tasks/${taskId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update task: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to toggle task completion:', error);
    throw error;
  }
}

/**
 * Verify that a task's completion status was properly persisted
 */
async function verifyTaskPersistence(projectId, taskId, expectedCompletionStatus) {
  try {
    // Fetch the task directly from the database
    const tasks = await getTasksFromDb(projectId);
    const task = tasks.find(t => t.id === taskId || t.source_id === taskId);
    
    if (!task) {
      throw new Error(`Task not found in database: ${taskId}`);
    }
    
    console.log(`Task state from database:`, task);
    console.log(`Completion status: ${Boolean(task.completed)}`);
    
    // Verify that the completion status matches what we expect
    const actualStatus = Boolean(task.completed);
    if (actualStatus !== expectedCompletionStatus) {
      throw new Error(
        `Persistence verification failed! Expected: ${expectedCompletionStatus}, Actual: ${actualStatus}`
      );
    }
    
    console.log(`✅ Persistence verification passed! Task completion status was successfully persisted.`);
    return { success: true, task };
  } catch (error) {
    console.error('Persistence verification failed:', error);
    return { success: false, error };
  }
}

/**
 * Run the full test
 */
async function runTaskPersistenceTest() {
  try {
    // You'll need to provide a valid project and task ID
    const projectId = process.argv[2];
    const taskId = process.argv[3];
    
    if (!projectId || !taskId) {
      console.error('Please provide project ID and task ID arguments:');
      console.error('node test-task-persistence.js <projectId> <taskId>');
      process.exit(1);
    }
    
    console.log(`Running task persistence test with project=${projectId}, task=${taskId}`);
    
    // 1. Get the task's current state
    const tasks = await getTasksFromDb(projectId);
    const task = tasks.find(t => t.id === taskId || t.source_id === taskId);
    
    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }
    
    console.log(`Found task:`, task);
    const currentStatus = Boolean(task.completed);
    console.log(`Current completion status: ${currentStatus}`);
    
    // 2. Toggle the task to the opposite status
    const newStatus = !currentStatus;
    console.log(`Toggling task to ${newStatus ? 'completed' : 'not completed'}...`);
    const updateResult = await toggleTaskCompletion(projectId, taskId, newStatus);
    console.log(`Update API response:`, updateResult);
    
    // 3. Verify the change was persisted
    console.log(`Verifying persistence...`);
    const verificationResult = await verifyTaskPersistence(projectId, taskId, newStatus);
    
    if (verificationResult.success) {
      console.log(`\n✅ TEST PASSED: Task persistence is working correctly!`);
      
      // 4. Toggle back to original state for cleanup
      console.log(`\nResetting task to original state (${currentStatus ? 'completed' : 'not completed'})...`);
      await toggleTaskCompletion(projectId, taskId, currentStatus);
      console.log(`Task has been reset to its original state.`);
    } else {
      console.error(`\n❌ TEST FAILED: Task persistence is not working correctly!`);
    }
  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the test
runTaskPersistenceTest();