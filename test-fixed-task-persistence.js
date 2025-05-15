/**
 * Simple direct test to verify task persistence with the database
 * This script skips the API authentication layer and tests the database functions directly
 */
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Create a PostgreSQL client using the DATABASE_URL environment variable
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function testTaskPersistenceFixedFunctions() {
  try {
    // Connect to the database
    await client.connect();
    console.log('✅ Connected to database');

    // Use a known project ID 
    const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
    
    console.log(`Testing task persistence for project ID: ${projectId}`);

    // Create a test task directly in the database
    const taskText = `Test task created at ${new Date().toISOString()}`;
    const taskId = uuidv4();
    
    // Insert a new task directly in the database
    const insertQuery = `
      INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, completed, 
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 
        NOW(), NOW()
      ) RETURNING *
    `;
    
    const insertResult = await client.query(insertQuery, [
      taskId,
      projectId,
      taskText,
      'identification',
      'test',
      'direct-test',
      false
    ]);
    
    if (insertResult.rows.length > 0) {
      console.log('✅ Task created successfully:', insertResult.rows[0]);
      
      // Verify task was saved by querying the database
      const selectQuery = `
        SELECT * FROM project_tasks 
        WHERE project_id = $1 AND id = $2
      `;
      
      const selectResult = await client.query(selectQuery, [projectId, taskId]);
      
      if (selectResult.rows.length > 0) {
        console.log('✅ Task persistence verified! Task was found in the database.');
        console.log('Found task:', selectResult.rows[0]);
        
        // Update the task
        const updateQuery = `
          UPDATE project_tasks 
          SET text = $1, completed = $2, updated_at = NOW()
          WHERE id = $3 AND project_id = $4
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [
          `${taskText} (UPDATED)`,
          true,
          taskId,
          projectId
        ]);
        
        if (updateResult.rows.length > 0) {
          console.log('✅ Task updated successfully:', updateResult.rows[0]);
          
          // Delete the task
          const deleteQuery = `
            DELETE FROM project_tasks 
            WHERE id = $1 AND project_id = $2
            RETURNING id
          `;
          
          const deleteResult = await client.query(deleteQuery, [taskId, projectId]);
          
          if (deleteResult.rows.length > 0) {
            console.log(`✅ Task deleted successfully: ${deleteResult.rows[0].id}`);
            
            // Verify deletion
            const verifyQuery = `
              SELECT * FROM project_tasks 
              WHERE id = $1
            `;
            
            const verifyResult = await client.query(verifyQuery, [taskId]);
            
            if (verifyResult.rows.length === 0) {
              console.log('✅ Task deletion verified! Task no longer exists in the database.');
              console.log('✅ FULL TEST PASSED: Create, Read, Update, Delete operations all successful!');
            } else {
              console.log('❌ Task deletion failed! Task still exists in the database.');
            }
          } else {
            console.log('❌ Task deletion failed!');
          }
        } else {
          console.log('❌ Task update failed!');
        }
      } else {
        console.log('❌ Task persistence failed! Created task was not found in the database.');
      }
    } else {
      console.log('❌ Task creation failed!');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the test
testTaskPersistenceFixedFunctions();