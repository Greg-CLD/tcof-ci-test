/**
 * Simplified Test for Success Factor Task UUID Lookup
 * 
 * This script verifies our enhanced task lookup can handle both:
 * 1. Full UUID+suffix format
 * 2. Clean UUID (first 5 segments) format 
 * 
 * Run with: node quick-success-factor-test.js
 */

// Import required modules
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Test function to create and update a test task
async function runTest() {
  console.log('\n=== Testing Success Factor Task UUID Lookup ===\n');
  
  try {
    // Step 1: Create a test task with a compound ID in sourceId
    console.log('Creating test Success Factor task...');
    
    // Generate UUIDs for the test
    const { v4: uuidv4 } = require('uuid');
    const taskId = uuidv4(); // Generate a valid UUID for the task ID
    const baseUuid = 'f219d47b-39b5-5be1-86f2-e0ec3afc8e3b';
    const compoundId = `${baseUuid}-test${Date.now()}`;
    
    console.log(`Task ID (valid UUID): ${taskId}`);
    console.log(`Base UUID: ${baseUuid}`);
    console.log(`Compound ID (for sourceId): ${compoundId}`);
    
    // Insert test task
    const insertQuery = `
      INSERT INTO project_tasks (
        id, project_id, text, origin, source_id, completed, stage, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `;
    
    const insertParams = [
      taskId, // Use valid UUID for task ID
      PROJECT_ID,
      'Test Success Factor Task',
      'factor', // Match the origin we're testing
      compoundId, // Use the compound ID as sourceId
      false,
      'identification'
    ];
    
    const insertResult = await pool.query(insertQuery, insertParams);
    
    if (insertResult.rows.length === 0) {
      throw new Error('Failed to insert test task');
    }
    
    const testTask = insertResult.rows[0];
    console.log(`Successfully created test task with ID: ${testTask.id}`);
    console.log(`Initial completed state: ${testTask.completed}`);
    
    // Step 2: Test updating the task using clean UUID (first 5 segments)
    const cleanUuid = baseUuid;
    console.log(`\nTest 1: Updating task using clean UUID: ${cleanUuid}`);
    
    // Update task using only the UUID part
    const updateQuery1 = `
      UPDATE project_tasks
      SET completed = true
      WHERE project_id = $1
      AND (id LIKE $2 || '%' OR source_id LIKE $2 || '%')
      AND origin = 'factor'
      RETURNING *
    `;
    
    const updateResult1 = await pool.query(updateQuery1, [PROJECT_ID, cleanUuid]);
    
    if (updateResult1.rows.length === 0) {
      throw new Error('Failed to update task using clean UUID');
    }
    
    console.log(`Updated task using clean UUID: ${updateResult1.rows[0].id}`);
    console.log(`New completed state: ${updateResult1.rows[0].completed}`);
    
    // Step 3: Test updating the task using full compound ID
    console.log(`\nTest 2: Updating task using full compound ID: ${compoundId}`);
    
    // Update task using the full compound ID
    const updateQuery2 = `
      UPDATE project_tasks
      SET completed = false
      WHERE project_id = $1
      AND id = $2
      RETURNING *
    `;
    
    const updateResult2 = await pool.query(updateQuery2, [PROJECT_ID, compoundId]);
    
    if (updateResult2.rows.length === 0) {
      throw new Error('Failed to update task using full compound ID');
    }
    
    console.log(`Updated task using full compound ID: ${updateResult2.rows[0].id}`);
    console.log(`New completed state: ${updateResult2.rows[0].completed}`);
    
    // Verify both operations updated the same task
    console.log('\nVerifying both updates affected the same task:');
    console.log(`Clean UUID update - task ID: ${updateResult1.rows[0].id}`);
    console.log(`Full ID update - task ID: ${updateResult2.rows[0].id}`);
    console.log(`Match: ${updateResult1.rows[0].id === updateResult2.rows[0].id ? 'YES' : 'NO'}`);
    
    // Step 4: Clean up - remove test task
    console.log('\nCleaning up test task...');
    const deleteQuery = `DELETE FROM project_tasks WHERE id = $1 RETURNING id`;
    const deleteResult = await pool.query(deleteQuery, [compoundId]);
    
    if (deleteResult.rows.length > 0) {
      console.log(`Test task ${deleteResult.rows[0].id} deleted successfully`);
    } else {
      console.log('No task was deleted');
    }
    
    // Final result
    console.log('\n=== Test Results ===');
    console.log(`Clean UUID lookup test: ${updateResult1.rows.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Full compound ID lookup test: ${updateResult2.rows.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Task ID consistency: ${updateResult1.rows[0].id === updateResult2.rows[0].id ? 'PASS' : 'FAIL'}`);
    
    const allTestsPassed = 
      updateResult1.rows.length > 0 && 
      updateResult2.rows.length > 0 && 
      updateResult1.rows[0].id === updateResult2.rows[0].id;
    
    console.log(`\nOverall result: ${allTestsPassed ? 'SUCCESS' : 'FAILURE'}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
runTest();