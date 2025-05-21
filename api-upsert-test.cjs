/**
 * API Success Factor Task Upsert Test
 * 
 * This script tests the API endpoint for task upsert functionality.
 * It attempts to update a non-existent success-factor task via the API.
 */

const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

// Main test function
async function runTest() {
  console.log('=== API SUCCESS FACTOR TASK UPSERT TEST ===\n');
  
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
    
    // Step 4: Try to update the non-existent task via API (this should create it)
    console.log('Step 4: Sending PUT request to update non-existent task...');
    
    const taskData = {
      projectId,
      text: 'API Test Success Factor Task',
      origin: 'success-factor',
      stage: 'identification',
      completed: false,
      // Using the taskId as both id and sourceId (this is what the API should do internally)
      id: taskId,
      sourceId: taskId
    };
    
    // Send the PUT request using the http module
    const responseResult = await sendPutRequest(projectId, taskId, taskData);
    
    if (!responseResult.success) {
      console.error(`❌ API PUT request failed with status: ${responseResult.status}`);
      console.error(`Response: ${responseResult.data}`);
      return false;
    }
    
    console.log(`✅ API PUT request succeeded with status: ${responseResult.status}`);
    
    // Step 5: Verify task was created in the database
    console.log('\nStep 5: Verifying task was created...');
    const verifyResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (verifyResult.rows.length === 0) {
      console.error('❌ Task not found in database after PUT request');
      return false;
    }
    
    const task = verifyResult.rows[0];
    console.log('✅ Task found in database:');
    console.log('  ID:', task.id);
    console.log('  Project ID:', task.project_id);
    console.log('  Text:', task.text);
    console.log('  Origin:', task.origin);
    console.log('  Completed:', task.completed);
    
    // Step 6: Update the task again via API
    console.log('\nStep 6: Updating task again via API...');
    
    const updateData = {
      projectId,
      text: 'Updated API Test Task',
      completed: true
    };
    
    const updateResult = await sendPutRequest(projectId, taskId, updateData);
    
    if (!updateResult.success) {
      console.error(`❌ API update failed with status: ${updateResult.status}`);
      console.error(`Response: ${updateResult.data}`);
      return false;
    }
    
    console.log(`✅ API update succeeded with status: ${updateResult.status}`);
    
    // Step 7: Verify update was applied
    console.log('\nStep 7: Verifying update was applied...');
    const finalResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (finalResult.rows.length === 0) {
      console.error('❌ Task not found after update');
      return false;
    }
    
    const updatedTask = finalResult.rows[0];
    console.log('✅ Updated task in database:');
    console.log('  ID:', updatedTask.id);
    console.log('  Text:', updatedTask.text);
    console.log('  Completed:', updatedTask.completed);
    
    const isCorrectlyUpdated = 
      updatedTask.text === 'Updated API Test Task' && 
      updatedTask.completed === true;
    
    if (!isCorrectlyUpdated) {
      console.error('❌ Task was not correctly updated');
      return false;
    }
    
    console.log('✅ Task was correctly updated with new values\n');
    
    // Step 8: Clean up
    console.log('Step 8: Cleaning up test data...');
    await client.query(
      'DELETE FROM project_tasks WHERE id = $1',
      [taskId]
    );
    console.log('✅ Test data cleaned up\n');
    
    console.log('🎉 API SUCCESS FACTOR TASK UPSERT TEST PASSED!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

// Helper function to send PUT request to the API
async function sendPutRequest(projectId, taskId, data) {
  return new Promise((resolve) => {
    const jsonData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/projects/${projectId}/tasks/${taskId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': jsonData.length,
        'X-Auth-Override': 'true'
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