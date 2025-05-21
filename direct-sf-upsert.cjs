/**
 * Direct Success Factor Task Upsert Test using the Project Database Functions
 * 
 * This script tests the direct database functions for success-factor task upsert functionality.
 */

const { Client } = require('pg');
const crypto = require('crypto');

// Main function
async function runTest() {
  console.log('=== DIRECT SUCCESS FACTOR TASK UPSERT TEST ===\n');
  
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
    const taskId = crypto.randomUUID();
    console.log(`Step 2: Generated test task ID: ${taskId}\n`);
    
    // Step 3: Verify the task doesn't exist
    console.log('Step 3: Verifying task does not exist...');
    const existingTaskResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (existingTaskResult.rows.length > 0) {
      console.error('❌ Task unexpectedly exists already');
      return false;
    }
    
    console.log('✅ Confirmed task does not exist\n');
    
    // Step 4: Create the success-factor task directly
    console.log('Step 4: Creating success-factor task...');
    
    const createQuery = `
      INSERT INTO project_tasks (
        id, project_id, text, origin, stage, completed, source_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `;
    
    const createResult = await client.query(createQuery, [
      taskId,
      projectId,
      'Direct Test Success Factor Task',
      'success-factor',
      'identification',
      false,
      taskId // Using same ID as sourceId
    ]);
    
    if (createResult.rows.length === 0) {
      console.error('❌ Failed to create task');
      return false;
    }
    
    const task = createResult.rows[0];
    console.log('✅ Task created successfully:');
    console.log('  ID:', task.id);
    console.log('  Project ID:', task.project_id);
    console.log('  Text:', task.text);
    console.log('  Origin:', task.origin);
    console.log('  Completed:', task.completed);
    console.log('  Source ID:', task.source_id);
    
    // Step 5: Update the task
    console.log('\nStep 5: Updating the task...');
    
    const updateQuery = `
      UPDATE project_tasks
      SET text = $1, completed = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, [
      'Updated Success Factor Task',
      true,
      taskId
    ]);
    
    if (updateResult.rows.length === 0) {
      console.error('❌ Failed to update task');
      return false;
    }
    
    const updatedTask = updateResult.rows[0];
    console.log('✅ Task updated successfully:');
    console.log('  ID:', updatedTask.id);
    console.log('  Text:', updatedTask.text);
    console.log('  Completed:', updatedTask.completed);
    
    // Step 6: Clean up test data
    console.log('\nStep 6: Cleaning up test data...');
    await client.query(
      'DELETE FROM project_tasks WHERE id = $1',
      [taskId]
    );
    console.log('✅ Test task deleted successfully\n');
    
    console.log('🎉 DIRECT SUCCESS FACTOR TASK UPSERT TEST PASSED!');
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

// Run the test
runTest().then(success => {
  if (!success) {
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  }
});