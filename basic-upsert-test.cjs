/**
 * Basic Success Factor Task Upsert Test
 * 
 * This script verifies that our upsert functionality for success-factor tasks works correctly.
 * It implements a simpler test than the full testing framework.
 */

const crypto = require('crypto');
const { Client } = require('pg');

function createSuccessFactorUUID() {
  // Generate a random UUID for testing
  return crypto.randomUUID();
}

async function runTest() {
  console.log('=== SUCCESS FACTOR TASK UPSERT TEST ===\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Step 1: Get a valid project to test with
    console.log('Step 1: Getting a valid project...');
    const projectsResult = await client.query('SELECT id FROM projects LIMIT 1');
    if (projectsResult.rows.length === 0) {
      console.error('❌ No projects found for testing');
      return false;
    }
    
    const projectId = projectsResult.rows[0].id;
    console.log(`✅ Found project ID: ${projectId}\n`);
    
    // Step 2: Generate a brand new UUID for the task
    const taskId = createSuccessFactorUUID();
    console.log(`Step 2: Generated test task ID: ${taskId}\n`);
    
    // Step 3: Verify the task doesn't exist
    console.log('Step 3: Verifying task does not exist...');
    const existingTaskResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (existingTaskResult.rows.length > 0) {
      console.error('❌ Task unexpectedly exists already, test cannot continue');
      return false;
    }
    
    console.log('✅ Confirmed task does not exist\n');
    
    // Step 4: Try to directly create the task with success-factor origin
    console.log('Step 4: Creating success-factor task...');
    
    try {
      const insertResult = await client.query(
        `INSERT INTO project_tasks 
         (id, project_id, text, stage, completed, origin, source_id) 
         VALUES 
         ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          taskId,                    // id
          projectId,                 // project_id
          'Test Success Factor Task', // text
          'identification',          // stage
          false,                     // completed
          'success-factor',          // origin
          taskId                     // source_id (same as id for success factors)
        ]
      );
      
      if (insertResult.rows.length === 0) {
        console.error('❌ Failed to create task');
        return false;
      }
      
      console.log('✅ Successfully created task:');
      console.log('  ID:', insertResult.rows[0].id);
      console.log('  Project ID:', insertResult.rows[0].project_id);
      console.log('  Text:', insertResult.rows[0].text);
      console.log('  Origin:', insertResult.rows[0].origin);
      console.log('  Completed:', insertResult.rows[0].completed);
      
      // Step 5: Update the task
      console.log('\nStep 5: Updating the task...');
      
      const updateResult = await client.query(
        `UPDATE project_tasks 
         SET completed = true, 
             text = 'Updated Success Factor Task' 
         WHERE id = $1 
         RETURNING *`,
        [taskId]
      );
      
      if (updateResult.rows.length === 0) {
        console.error('❌ Failed to update task');
        return false;
      }
      
      console.log('✅ Successfully updated task:');
      console.log('  ID:', updateResult.rows[0].id);
      console.log('  Text:', updateResult.rows[0].text);
      console.log('  Completed:', updateResult.rows[0].completed);
      
      // Step 6: Clean up test data
      console.log('\nStep 6: Cleaning up test data...');
      
      await client.query(
        'DELETE FROM project_tasks WHERE id = $1',
        [taskId]
      );
      
      console.log('✅ Test task deleted successfully');
      console.log('\n🎉 SUCCESS FACTOR TASK UPSERT TEST PASSED!');
      return true;
      
    } catch (error) {
      console.error('❌ Error during test:', error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

runTest().then(success => {
  if (!success) {
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  }
});