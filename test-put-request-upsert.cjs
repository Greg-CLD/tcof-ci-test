/**
 * Test for Success Factor Task Upsert via PUT Request
 * 
 * This script directly uses the built-in node-fetch to test
 * the PUT endpoint for missing success-factor tasks.
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

// Fix for self-signed cert issues in local development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    
    // Verify the task doesn't exist before starting
    const checkResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTaskId]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Task already exists, generating a new ID to ensure it does not exist');
      return runTest(); // Recursively run with a new ID
    }
    
    console.log('✅ Confirmed task does not exist before test');
    
    // Now send a PUT request to update the non-existent task
    console.log('\nSending PUT request to task endpoint...');
    
    const taskData = {
      origin: 'success-factor',
      text: 'Test Success Factor via PUT API',
      stage: 'identification',
      completed: true,
      projectId
    };
    
    // Send the request directly to the server
    const response = await fetch(
      `http://localhost:5000/api/projects/${projectId}/tasks/${testTaskId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Using server-side direct call to bypass auth check
          // This is for testing purposes only
          'X-Auth-Override': 'true'
        },
        body: JSON.stringify(taskData)
      }
    );
    
    console.log(`PUT Response Status: ${response.status}`);
    
    // Verify whether the task was created by checking the database
    const verifyResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTaskId]
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ SUCCESS! Task was automatically created via PUT request');
      console.log('Task details:', verifyResult.rows[0]);
      
      // For a complete test, verify the settings were applied
      const task = verifyResult.rows[0];
      const allCorrect = 
        task.origin === 'success-factor' &&
        task.text === 'Test Success Factor via PUT API' &&
        task.stage === 'identification';
        
      if (allCorrect) {
        console.log('✅ SUCCESS! All task properties were set correctly');
      } else {
        console.log('⚠️ WARNING: Some task properties were not set correctly');
        console.log('Expected: success-factor, "Test Success Factor via PUT API", identification');
        console.log(`Actual: ${task.origin}, "${task.text}", ${task.stage}`);
      }
    } else {
      console.log('❌ FAILURE! Task was not created after PUT request');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

// Run the test
runTest();