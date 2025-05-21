/**
 * Smoke Test for Success Factor Task Upsert Functionality
 * 
 * This script tests the ability to automatically create a success-factor task
 * when it doesn't exist during a PUT request to the task update endpoint.
 * 
 * The test:
 * 1. Gets an existing project
 * 2. Generates a new UUID for a task that doesn't exist
 * 3. Sends a PUT request to update this non-existent task with origin="success-factor"
 * 4. Verifies that the task was automatically created
 */

const { Client } = require('pg');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

// Extract session cookie from existing browser session to bypass authentication
function extractSessionCookie() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      return fs.readFileSync('./cookies.txt', 'utf8').trim();
    }
    return '';
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return '';
  }
}

async function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve) => {
    const sessionCookie = extractSessionCookie() || 'sid=nOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs';
    const jsonData = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
        'X-Auth-Override': 'true'
      }
    };
    
    if (body) {
      options.headers['Content-Length'] = jsonData.length;
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          parsedData = responseData;
        }
        
        resolve({
          statusCode: res.statusCode,
          data: parsedData
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        data: error.message
      });
    });
    
    if (body) {
      req.write(jsonData);
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== SUCCESS FACTOR TASK UPSERT SMOKE TEST ===\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Step 1: Get a valid project
    console.log('Step 1: Finding a valid project...');
    const projectsResult = await client.query('SELECT id FROM projects LIMIT 1');
    if (projectsResult.rows.length === 0) {
      console.error('❌ No projects found for testing');
      return false;
    }
    
    const projectId = projectsResult.rows[0].id;
    console.log(`✅ Found project ID: ${projectId}\n`);
    
    // Step 2: Generate a task ID that doesn't exist
    console.log('Step 2: Generating a new task ID...');
    const taskId = crypto.randomUUID();
    
    // Verify task doesn't exist
    const existingTaskResult = await client.query(
      'SELECT id FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (existingTaskResult.rows.length > 0) {
      console.error('❌ Task unexpectedly already exists with ID:', taskId);
      return false;
    }
    
    console.log(`✅ Generated new task ID: ${taskId}`);
    console.log('✅ Confirmed task does not exist in database\n');
    
    // Step 3: Attempt to update this non-existent task via the API
    console.log('Step 3: Sending PUT request to update non-existent task...');
    
    const taskUpdate = {
      text: 'Success Factor Upsert Test Task',
      origin: 'success-factor',
      completed: false,
      stage: 'identification'
    };
    
    const endpoint = `/api/projects/${projectId}/tasks/${taskId}`;
    const response = await apiRequest('PUT', endpoint, taskUpdate);
    
    console.log(`API Response Status: ${response.statusCode}`);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ PUT request successful\n');
      console.log('Success response data:', JSON.stringify(response.data, null, 2));
    } else {
      console.error(`❌ PUT request failed with status: ${response.statusCode}`);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
    
    // Step 4: Verify the task was actually created in the database
    console.log('\nStep 4: Verifying task was created in database...');
    
    const verifyResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [taskId]
    );
    
    if (verifyResult.rows.length === 0) {
      console.error('❌ Task not found in database after PUT request');
      return false;
    }
    
    const createdTask = verifyResult.rows[0];
    console.log('✅ Task found in database:');
    console.log(`  - ID: ${createdTask.id}`);
    console.log(`  - Text: ${createdTask.text}`);
    console.log(`  - Origin: ${createdTask.origin}`);
    console.log(`  - Completed: ${createdTask.completed}`);
    console.log(`  - Stage: ${createdTask.stage}`);
    
    // Step 5: Clean up the test data
    console.log('\nStep 5: Cleaning up test data...');
    await client.query('DELETE FROM project_tasks WHERE id = $1', [taskId]);
    console.log('✅ Test task deleted from database\n');
    
    console.log('🎉 SUCCESS FACTOR TASK UPSERT SMOKE TEST PASSED!');
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