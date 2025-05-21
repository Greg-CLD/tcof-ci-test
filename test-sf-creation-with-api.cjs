/**
 * Success Factor Task Creation Test via API
 * 
 * This script tests creating a success-factor task directly through the
 * POST /api/projects/:projectId/tasks API endpoint.
 */

const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

// Main test function
async function runTest() {
  console.log('=== SUCCESS FACTOR TASK CREATION TEST VIA API ===\n');
  
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
      console.error('❌ Task unexpectedly exists already, test cannot continue');
      return false;
    }
    
    console.log('✅ Confirmed task does not exist\n');
    
    // Step 4: Create the success-factor task via the API
    console.log('Step 4: Creating success-factor task via API...');
    
    const taskData = {
      id: taskId,
      text: 'API Test Success Factor Task Creation',
      origin: 'success-factor',
      stage: 'identification',
      completed: false,
      sourceId: taskId
    };
    
    const responseResult = await sendPostRequest(projectId, taskData);
    
    if (!responseResult.success) {
      console.error(`❌ API POST request failed with status: ${responseResult.status}`);
      console.error(`Response: ${JSON.stringify(responseResult.data, null, 2)}`);
      return false;
    }
    
    console.log(`✅ API POST request succeeded with status: ${responseResult.status}`);
    
    // Step 5: Verify task was created in the database
    console.log('\nStep 5: Verifying task was created...');
    const verifyResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (verifyResult.rows.length === 0) {
      console.error('❌ Task not found in database after POST request');
      return false;
    }
    
    const task = verifyResult.rows[0];
    console.log('✅ Task found in database:');
    console.log('  ID:', task.id);
    console.log('  Project ID:', task.project_id);
    console.log('  Text:', task.text);
    console.log('  Origin:', task.origin);
    console.log('  Completed:', task.completed);
    console.log('  Source ID:', task.source_id);
    
    // Step 6: Clean up test data
    console.log('\nStep 6: Cleaning up test data...');
    await client.query(
      'DELETE FROM project_tasks WHERE id = $1',
      [taskId]
    );
    console.log('✅ Test task deleted successfully\n');
    
    console.log('🎉 SUCCESS FACTOR TASK CREATION TEST VIA API PASSED!');
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

// Helper function to send POST request to the API
async function sendPostRequest(projectId, data) {
  return new Promise((resolve) => {
    const jsonData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/projects/${projectId}/tasks`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': jsonData.length,
        'X-Auth-Override': 'true',
        'Cookie': 'sid=nOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs'
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 300;
        
        let parsedData = responseData;
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          // Keep raw response if not JSON
        }
        
        resolve({
          success,
          status: res.statusCode,
          data: parsedData
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        status: 0,
        data: error.message
      });
    });
    
    req.write(jsonData);
    req.end();
  });
}

// Run the test
runTest().then(success => {
  if (!success) {
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  }
});