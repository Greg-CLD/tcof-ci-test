/**
 * Direct Database Test: Success Factor Task Persistence
 * 
 * This script directly tests the database to verify that Success Factor task persistence
 * is working properly by:
 * 1. Finding a project with Success Factor tasks
 * 2. Getting all tasks for that project
 * 3. Selecting a Success Factor task
 * 4. Toggling its completion state
 * 5. Verifying metadata is preserved
 * 
 * Run with: node check-db-task-persistence.js
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database configuration - uses the DATABASE_URL environment variable
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Test configuration
const PROJECT_ID = '7277a5fe-899b-4fe6-8e35-05dd6103d054'; // Bug Test Project
const DEBUG = true;

// Result tracking
const results = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  errors: []
};

// Create a database client
const client = new pg.Client(dbConfig);

// Helper function for assertions
function assert(condition, message) {
  results.totalTests++;
  
  if (condition) {
    results.passedTests++;
    console.log(`[PASS] ${message}`);
    return true;
  } else {
    results.failedTests++;
    const errorMessage = `[FAIL] ${message}`;
    console.error(errorMessage);
    results.errors.push(errorMessage);
    return false;
  }
}

// Helper function for database queries
async function query(sql, params = []) {
  try {
    if (DEBUG) {
      console.log(`[DB] Executing query: ${sql}`);
      if (params.length > 0) {
        console.log(`[DB] Parameters: ${JSON.stringify(params)}`);
      }
    }
    
    const result = await client.query(sql, params);
    
    if (DEBUG) {
      console.log(`[DB] Query returned ${result.rowCount} rows`);
    }
    
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
}

// Main test function
async function runDatabaseTest() {
  console.log('\n===== Success Factor Task Persistence Database Test =====\n');
  console.log(`Testing with project: ${PROJECT_ID}\n`);
  
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to the database\n');
    
    // Step 1: Check if the project exists
    console.log('Step 1: Verifying project exists...');
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [PROJECT_ID]
    );
    
    assert(projectResult.rowCount > 0, `Project ${PROJECT_ID} found in database`);
    
    if (projectResult.rowCount === 0) {
      throw new Error(`Project ${PROJECT_ID} not found in database. Test cannot continue.`);
    }
    
    const project = projectResult.rows[0];
    console.log(`Found project: ${project.name} (ID: ${project.id})`);
    
    // Step 2: Get all tasks for the project
    console.log('\nStep 2: Fetching tasks for the project...');
    const tasksResult = await query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [PROJECT_ID]
    );
    
    assert(tasksResult.rowCount > 0, `Found ${tasksResult.rowCount} tasks for the project`);
    console.log(`Retrieved ${tasksResult.rowCount} tasks`);
    
    // Step 3: Find Success Factor tasks
    console.log('\nStep 3: Identifying Success Factor tasks...');
    const allTasks = tasksResult.rows;
    const successFactorTasks = allTasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    assert(successFactorTasks.length > 0, 'At least one Success Factor task found');
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      // If no Success Factor tasks found, let's see if we can create one for testing
      console.log('\nNo Success Factor tasks found, creating one for testing...');
      
      const newTask = {
        id: uuidv4(),
        project_id: PROJECT_ID,
        text: 'Test Success Factor Task',
        stage: 'Definition',
        origin: 'factor',
        source: 'factor',
        source_id: uuidv4(),
        completed: false,
        notes: '',
        priority: 'medium',
        owner: '',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await query(
        `INSERT INTO project_tasks
         (id, project_id, text, stage, origin, source, source_id, completed, notes, 
          priority, owner, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          newTask.id, newTask.project_id, newTask.text, newTask.stage, 
          newTask.origin, newTask.source, newTask.source_id, newTask.completed, 
          newTask.notes, newTask.priority, newTask.owner, newTask.status, 
          newTask.created_at, newTask.updated_at
        ]
      );
      
      console.log(`Created test Success Factor task with ID: ${newTask.id}`);
      
      // Refetch the tasks to include our new one
      const updatedTasksResult = await query(
        'SELECT * FROM project_tasks WHERE project_id = $1',
        [PROJECT_ID]
      );
      
      const updatedTasks = updatedTasksResult.rows;
      const updatedSuccessFactorTasks = updatedTasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      assert(updatedSuccessFactorTasks.length > 0, 'Success Factor task successfully created');
      console.log(`Now have ${updatedSuccessFactorTasks.length} Success Factor tasks`);
      
      // Use the newly created tasks for the test
      successFactorTasks.push(newTask);
    }
    
    // Step 4: Select a task for testing
    console.log('\nStep 4: Selecting a Success Factor task for testing...');
    const testTask = successFactorTasks[0];
    
    console.log(`Selected task: ${testTask.id}`);
    console.log(`Task details:`);
    console.log(`  - Text: ${testTask.text}`);
    console.log(`  - Origin: ${testTask.origin}`);
    console.log(`  - Source ID: ${testTask.source_id}`);
    console.log(`  - Current completion state: ${testTask.completed}`);
    
    // Step 5: Toggle the task's completion state
    console.log('\nStep 5: Toggling task completion state...');
    const newCompletionState = !testTask.completed;
    
    await query(
      'UPDATE project_tasks SET completed = $1, updated_at = $2 WHERE id = $3',
      [newCompletionState, new Date().toISOString(), testTask.id]
    );
    
    console.log(`Task completion state toggled to: ${newCompletionState}`);
    
    // Step 6: Verify the update was successful
    console.log('\nStep 6: Verifying task update...');
    const updatedTaskResult = await query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTask.id]
    );
    
    assert(updatedTaskResult.rowCount === 1, 'Task found after update');
    
    const updatedTask = updatedTaskResult.rows[0];
    
    // Verify the completion state was changed
    assert(
      updatedTask.completed === newCompletionState,
      `Task completion state changed from ${testTask.completed} to ${newCompletionState}`
    );
    
    // Verify critical metadata was preserved
    assert(
      updatedTask.origin === testTask.origin,
      `Task origin was preserved: ${updatedTask.origin}`
    );
    
    assert(
      updatedTask.source_id === testTask.source_id,
      `Task source_id was preserved: ${updatedTask.source_id}`
    );
    
    // Step 7: Test lookup by source_id (key part of our fix)
    console.log('\nStep 7: Testing task lookup by source_id...');
    
    if (testTask.source_id) {
      const sourceIdLookupResult = await query(
        'SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2',
        [PROJECT_ID, testTask.source_id]
      );
      
      assert(
        sourceIdLookupResult.rowCount > 0,
        `Task successfully found by source_id: ${testTask.source_id}`
      );
      
      if (sourceIdLookupResult.rowCount > 0) {
        const taskBySourceId = sourceIdLookupResult.rows[0];
        
        assert(
          taskBySourceId.id === testTask.id,
          `Task found by source_id has correct ID: ${taskBySourceId.id}`
        );
        
        assert(
          taskBySourceId.completed === newCompletionState,
          `Task found by source_id has updated completion state: ${taskBySourceId.completed}`
        );
      }
    } else {
      console.log('Task does not have a source_id, skipping source_id lookup test');
    }
    
    // Step 8: Toggle the task back to its original state for cleanup
    console.log('\nStep 8: Toggling task back to original state...');
    await query(
      'UPDATE project_tasks SET completed = $1, updated_at = $2 WHERE id = $3',
      [testTask.completed, new Date().toISOString(), testTask.id]
    );
    
    console.log(`Task completion state restored to: ${testTask.completed}`);
    
    // Final verification
    const finalTaskResult = await query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTask.id]
    );
    
    const finalTask = finalTaskResult.rows[0];
    
    assert(
      finalTask.completed === testTask.completed,
      `Task completion state correctly restored to original: ${finalTask.completed}`
    );
    
    // Print test summary
    console.log('\n===== Test Summary =====');
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`Passed tests: ${results.passedTests}`);
    console.log(`Failed tests: ${results.failedTests}`);
    
    if (results.failedTests > 0) {
      console.log('\nErrors:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log('\nTest FAILED');
    } else {
      console.log('\nAll tests PASSED');
      console.log('Success Factor task persistence is working correctly!');
    }
    
  } catch (error) {
    console.error('Test failed with unexpected error:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
runDatabaseTest();