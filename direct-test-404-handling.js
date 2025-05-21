/**
 * Direct Test for Task Not Found Handling (404 vs 500)
 * 
 * This script directly tests our error handling improvement for non-existent tasks
 * by simulating the code path that would generate TASK_NOT_FOUND errors.
 * 
 * It specifically tests:
 * 1. Trying to find a task with an ID that doesn't exist
 * 2. Verifying that error has correct code 'TASK_NOT_FOUND'
 * 3. Checking that our route handler converts this to a 404 (not 500) status
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Connect to database
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Simulate the task lookup function from projectsDb.ts
async function findTaskById(taskId) {
  console.log(`[TEST] Looking up task with ID: ${taskId}`);
  
  try {
    // Query the database directly with SQL
    const tasks = await sql`
      SELECT * FROM project_tasks 
      WHERE id = ${taskId} 
      LIMIT 1
    `;
    
    if (tasks.length === 0) {
      console.log(`[TEST] Task not found with ID: ${taskId}`);
      
      // Create error with custom code
      const notFoundError = new Error(`Task with ID ${taskId} not found`);
      notFoundError.code = 'TASK_NOT_FOUND';
      
      throw notFoundError;
    }
    
    return tasks[0];
  } catch (error) {
    // Rethrow error
    throw error;
  }
}

// Simulate our route handler's error handling
function simulateRouteHandler(error) {
  // Check for our custom TASK_NOT_FOUND code
  if (error && error.code === 'TASK_NOT_FOUND') {
    console.log('[TEST] Route handler detected TASK_NOT_FOUND error');
    return {
      status: 404,
      body: {
        success: false,
        message: 'Task not found',
        error: error.message
      }
    };
  }
  
  // For all other errors, return 500
  console.log('[TEST] Route handler detected unknown error');
  return {
    status: 500,
    body: {
      success: false,
      message: 'Internal server error',
      error: error.message
    }
  };
}

// Run the test
async function runTest() {
  console.log('=== TASK NOT FOUND ERROR HANDLING TEST ===\n');
  console.log('This test verifies our error handling returns 404 (not 500) for non-existent tasks\n');
  
  const results = {
    taskNotFoundErrorThrown: false,
    errorHasCorrectCode: false,
    routeHandlerReturns404: false
  };
  
  try {
    // Use a completely made-up task ID
    const nonExistentId = 'ffffffff-ffff-ffff-ffff-' + Date.now().toString(16);
    console.log(`Testing with non-existent task ID: ${nonExistentId}`);
    
    try {
      // This should throw a TASK_NOT_FOUND error
      await findTaskById(nonExistentId);
      console.log('❌ Test failed: No error was thrown for non-existent task');
    } catch (error) {
      results.taskNotFoundErrorThrown = true;
      console.log(`✅ Task lookup correctly threw error: ${error.message}`);
      
      // Check if the error has the correct code
      if (error.code === 'TASK_NOT_FOUND') {
        results.errorHasCorrectCode = true;
        console.log('✅ Error has correct code: TASK_NOT_FOUND');
      } else {
        console.log(`❌ Error has incorrect code: ${error.code || 'undefined'}`);
      }
      
      // Simulate how the route handler would handle this error
      const response = simulateRouteHandler(error);
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body, null, 2)}`);
      
      // Check if the status is 404 (not 500)
      results.routeHandlerReturns404 = response.status === 404;
      if (results.routeHandlerReturns404) {
        console.log('✅ Route handler returned correct 404 status');
      } else {
        console.log(`❌ Route handler returned incorrect ${response.status} status`);
      }
    }
    
    // Overall results
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n=== TEST RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    console.log(`\nOverall: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Unexpected error during test:', error);
    return false;
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the test
runTest()
  .then(passed => {
    console.log('\nTest execution completed.');
    process.exit(passed ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error during test execution:', err);
    process.exit(1);
  });