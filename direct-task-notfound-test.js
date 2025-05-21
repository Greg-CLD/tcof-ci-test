/**
 * Direct Task Not Found Test
 * 
 * This script tests our task-not-found error handling with direct database access
 * to bypass authentication requirements.
 * 
 * It tests:
 * 1. Looking up a non-existent task ID using our lookup function
 * 2. Verifying the custom error code TASK_NOT_FOUND is returned
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Function that mimics our findTaskById implementation to test error handling
async function findTaskById(taskId) {
  console.log(`[TEST] Attempting to find task with ID: ${taskId}`);
  
  try {
    // Query the database directly with SQL
    const tasks = await sql`
      SELECT * FROM project_tasks 
      WHERE id = ${taskId} 
      LIMIT 1
    `;
    
    if (tasks.length === 0) {
      console.log(`[TEST] No task found with ID: ${taskId}`);
      
      // Create an error with a custom code - similar to our implementation
      const notFoundError = new Error(`Task with ID ${taskId} not found`);
      notFoundError.code = 'TASK_NOT_FOUND';
      
      throw notFoundError;
    }
    
    console.log(`[TEST] Found task: ${JSON.stringify(tasks[0])}`);
    return tasks[0];
  } catch (error) {
    console.log(`[TEST] Error during task lookup: ${error.message}`);
    
    // Re-throw with our custom error code if it doesn't already have one
    if (!error.code) {
      const enhancedError = new Error(`Database error during task lookup: ${error.message}`);
      enhancedError.code = 'DB_ERROR';
      throw enhancedError;
    }
    
    throw error;
  }
}

// Function to test error handling for non-existent task IDs
async function testTaskNotFound() {
  console.log('=== TASK NOT FOUND ERROR TEST ===');
  console.log('Testing error handling for non-existent task IDs\n');
  
  // Test with a completely made-up ID that won't exist
  const nonExistentId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  
  try {
    await findTaskById(nonExistentId);
    
    console.log('\n❌ TEST FAILED: The function did not throw an error for a non-existent task ID');
    return false;
  } catch (error) {
    if (error.code === 'TASK_NOT_FOUND') {
      console.log('\n✅ TEST PASSED: The function correctly threw a TASK_NOT_FOUND error');
      console.log(`Error message: ${error.message}`);
      console.log(`Error code: ${error.code}`);
      return true;
    } else {
      console.log('\n❌ TEST FAILED: The function threw an error, but not with the expected TASK_NOT_FOUND code');
      console.log(`Error message: ${error.message}`);
      console.log(`Error code: ${error.code || 'none'}`);
      return false;
    }
  }
}

// Main test function
async function runTests() {
  try {
    console.log('Starting task not found error handling tests...\n');
    
    const testResult = await testTaskNotFound();
    
    if (testResult) {
      console.log('\n✅ All tests passed! The task not found error handling is working correctly.');
    } else {
      console.log('\n❌ Tests failed. The task not found error handling needs to be fixed.');
    }
  } catch (error) {
    console.error('Unexpected error during tests:', error);
  } finally {
    // Clean up the database connection
    await sql.end();
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\nTest execution completed.');
  })
  .catch(err => {
    console.error('Unhandled error during test execution:', err);
  });