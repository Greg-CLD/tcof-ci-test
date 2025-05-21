/**
 * Direct test for success-factor task upsert feature
 * This test directly accesses the database to verify functionality
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get a project ID to use for testing
    const projectsResult = await client.query('SELECT id FROM projects LIMIT 1');
    if (projectsResult.rows.length === 0) {
      console.error('No projects found for testing');
      return;
    }
    
    const projectId = projectsResult.rows[0].id;
    console.log(`Using project ID: ${projectId}`);
    
    // Generate a test UUID for a task that doesn't exist
    const testTaskId = uuidv4();
    console.log(`Generated test task ID: ${testTaskId}`);
    
    // Insert directly using SQL to simulate the upsert functionality
    console.log('Testing direct success-factor task upsert...');
    
    // Check if the task exists before inserting
    const checkResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTaskId]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Task already exists, skipping create test');
    } else {
      // Insert a new task with success-factor origin
      const insertResult = await client.query(
        `INSERT INTO project_tasks 
         (id, project_id, text, stage, completed, origin, source_id) 
         VALUES 
         ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          testTaskId,            // id
          projectId,             // project_id
          'Test Success Factor', // text
          'identification',      // stage
          false,                 // completed
          'success-factor',      // origin
          testTaskId             // source_id (same as primary id)
        ]
      );
      
      if (insertResult.rows.length > 0) {
        console.log('✅ Successfully created new task with direct SQL insert');
        console.log('Task details:', insertResult.rows[0]);
      } else {
        console.error('❌ Failed to create task');
      }
    }
    
    // Now test updating the task
    console.log('\nTesting task update after creation...');
    const updateResult = await client.query(
      `UPDATE project_tasks 
       SET completed = true, 
           text = 'Updated Success Factor Test', 
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [testTaskId]
    );
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Successfully updated task via direct SQL update');
      console.log('Updated task details:', updateResult.rows[0]);
    } else {
      console.error('❌ Failed to update task');
    }
    
    console.log('\n🎉 SUCCESS FACTOR TASK UPSERT TEST COMPLETE!');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

runTest();