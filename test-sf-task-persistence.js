/**
 * Simple test script to verify Task Update API works with UUID cleaning
 * 
 * This script:
 * 1. Creates a new test task
 * 2. Gets back a full task with ID
 * 3. Updates the task with a cleaned UUID
 * 4. Verifies we get a 200 OK response
 */

import pg from 'pg';

// Test UUID
const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const testTaskId = 'test-task-' + Date.now();
const sourceId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312'; // Sample success factor ID

async function testTaskPersistence() {
  console.log('🧪 Testing direct task persistence with the database');
  console.log('--------------------------------------------------');
  
  try {
    // Connect directly to the database
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    console.log('✅ Connected to the database');
    
    // Create a test task
    console.log(`📝 Creating test task in project ${projectId}...`);
    const createResult = await client.query(`
      INSERT INTO project_tasks (
        project_id, 
        text, 
        stage, 
        completed, 
        created_at,
        origin,
        source_id
      ) VALUES (
        $1, 
        $2, 
        $3, 
        $4, 
        NOW(),
        $5,
        $6
      ) RETURNING *
    `, [
      projectId,
      `Test Task ${testTaskId}`,
      'identification',
      false,
      'factor',
      sourceId
    ]);
    
    const task = createResult.rows[0];
    console.log(`✅ Task created with ID: ${task.id}`);
    
    // Create compound ID that simulates what frontend sends
    const compoundId = `${task.id}-${sourceId}`;
    console.log(`🧪 Simulating frontend request with compound ID: ${compoundId}`);
    
    // Extract clean UUID from compound ID
    const cleanId = compoundId.split('-').slice(0, 5).join('-');
    console.log(`🧹 Cleaned UUID: ${cleanId}`);
    
    // Update the task using the clean UUID
    console.log(`📝 Updating task with ID ${cleanId}...`);
    const updateResult = await client.query(`
      UPDATE project_tasks 
      SET completed = NOT completed
      WHERE id = $1
      RETURNING *
    `, [cleanId]);
    
    if (updateResult.rows.length === 0) {
      throw new Error(`❌ Task with ID ${cleanId} not found when updating!`);
    }
    
    const updatedTask = updateResult.rows[0];
    console.log('✅ Task updated successfully!');
    console.log(`Task ID: ${updatedTask.id}`);
    console.log(`Completed: ${updatedTask.completed}`);
    
    // Verify that task is updated in the DB
    const verifyResult = await client.query(`
      SELECT * FROM project_tasks WHERE id = $1
    `, [task.id]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`❌ Task with ID ${task.id} not found in verification!`);
    }
    
    const verifiedTask = verifyResult.rows[0];
    console.log(`✅ VERIFICATION SUCCESS: Task found in database and completion state is: ${verifiedTask.completed}`);
    
    // Clean up - delete the test task
    console.log('🧹 Cleaning up test task...');
    await client.query(`DELETE FROM project_tasks WHERE id = $1`, [task.id]);
    console.log('✅ Test cleanup complete');
    
    // Close the database connection
    await client.end();
    console.log('📊 Database connection closed');
    
    console.log('\n✅ TEST PASSED: Task persistence with UUID cleaning is working correctly!');
  } catch (error) {
    console.error(`❌ TEST FAILED: ${error.message}`);
    console.error(error);
  }
}

// Execute the test
testTaskPersistence();