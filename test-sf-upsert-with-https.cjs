/**
 * Test for Success Factor Task Upsert via PUT Request
 * 
 * This script uses the built-in https module to test the PUT endpoint.
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

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
      console.log('Task already exists, skipping test');
      return;
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
    
    // Send the PUT request using the http module
    await new Promise((resolve, reject) => {
      const data = JSON.stringify(taskData);
      
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/projects/${projectId}/tasks/${testTaskId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'X-Auth-Override': 'true'
        }
      };
      
      const req = http.request(options, (res) => {
        console.log(`PUT Response Status: ${res.statusCode}`);
        
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonResponse = JSON.parse(responseData);
            console.log('Response data:', JSON.stringify(jsonResponse, null, 2));
            resolve();
          } catch (e) {
            console.log('Raw response data:', responseData);
            resolve();
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Error making request:', error.message);
        reject(error);
      });
      
      req.write(data);
      req.end();
    });
    
    // Allow time for the database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify whether the task was created by checking the database
    const verifyResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTaskId]
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('\n✅ SUCCESS! Task was automatically created via PUT request');
      console.log('Task details:', verifyResult.rows[0]);
      
      // For a complete test, verify the settings were applied
      const task = verifyResult.rows[0];
      const allCorrect = 
        task.origin === 'success-factor' &&
        task.text === 'Test Success Factor via PUT API' &&
        task.stage === 'identification';
        
      if (allCorrect) {
        console.log('\n✅ SUCCESS! All task properties were set correctly');
      } else {
        console.log('\n⚠️ WARNING: Some task properties were not set correctly');
        console.log('Expected: success-factor, "Test Success Factor via PUT API", identification');
        console.log(`Actual: ${task.origin}, "${task.text}", ${task.stage}`);
      }
    } else {
      console.log('\n❌ FAILURE! Task was not created after PUT request');
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