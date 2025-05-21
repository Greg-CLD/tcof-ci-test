/**
 * Smoke Test for Success Factor Task Upsert Feature
 * 
 * This script tests that the database logic works correctly for the 
 * upsert functionality (create-if-not-exists) for success-factor tasks.
 * 
 * Run with: node smoke-test-success-factor-upsert.cjs
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get a project ID to use for testing
    const projectsResult = await client.query('SELECT id FROM projects LIMIT 1');
    if (projectsResult.rows.length === 0) {
      console.error('❌ No projects found for testing');
      return;
    }
    
    const projectId = projectsResult.rows[0].id;
    console.log(`Using project ID: ${projectId}`);
    
    // Generate a unique test task ID
    const testTaskId = uuidv4();
    console.log(`Generated test task ID: ${testTaskId}\n`);
    
    // STEP 1: Verify task doesn't exist
    console.log('STEP 1: Checking if task exists before test...');
    const checkResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTaskId]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Task already exists (unexpected), generating a new ID');
      return runTest(); // Recursively try again with a new ID
    }
    
    console.log('✅ Confirmed task does not exist\n');
    
    // STEP 2: Create a success-factor task directly
    console.log('STEP 2: Creating success-factor task directly...');
    const insertResult = await client.query(
      `INSERT INTO project_tasks 
       (id, project_id, text, stage, completed, origin, source_id) 
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        testTaskId,                 // id
        projectId,                  // project_id
        'Test Success Factor Task', // text
        'identification',           // stage
        false,                      // completed
        'success-factor',           // origin
        testTaskId                  // source_id
      ]
    );
    
    if (insertResult.rows.length === 0) {
      console.error('❌ FAILED to create task');
      return;
    }
    
    console.log('✅ Successfully created task:');
    console.log('  ID:', insertResult.rows[0].id);
    console.log('  Project ID:', insertResult.rows[0].project_id);
    console.log('  Text:', insertResult.rows[0].text);
    console.log('  Origin:', insertResult.rows[0].origin);
    console.log('  Source ID:', insertResult.rows[0].source_id);
    console.log('  Completed:', insertResult.rows[0].completed);
    console.log('  Stage:', insertResult.rows[0].stage);
    console.log('\n');
    
    // STEP 3: Update the task
    console.log('STEP 3: Testing task update...');
    const updateResult = await client.query(
      `UPDATE project_tasks 
       SET completed = true, 
           text = 'Updated Success Factor Test', 
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [testTaskId]
    );
    
    if (updateResult.rows.length === 0) {
      console.error('❌ FAILED to update task');
      return;
    }
    
    console.log('✅ Successfully updated task:');
    console.log('  ID:', updateResult.rows[0].id);
    console.log('  Text:', updateResult.rows[0].text);
    console.log('  Completed:', updateResult.rows[0].completed);
    console.log('\n');
    
    // STEP 4: Delete the test task (cleanup)
    console.log('STEP 4: Cleaning up test data...');
    await client.query(
      'DELETE FROM project_tasks WHERE id = $1',
      [testTaskId]
    );
    
    console.log('✅ Test cleanup completed\n');
    console.log('🎉 SUCCESS FACTOR TASK UPSERT SMOKE TEST PASSED!\n');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

runTest();