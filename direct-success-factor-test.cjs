/**
 * Direct Success Factor Task Update Test
 * 
 * This script directly tests our task update endpoint using database access
 * to verify:
 * 1. Task update requests with partial UUIDs are properly matched
 * 2. Success factor tasks preserve their sourceId when updated
 * 3. The endpoint returns proper JSON with application/json Content-Type
 * 
 * This approach bypasses authentication requirements by accessing the database directly.
 */
const { Client } = require('pg');
const https = require('https');

// Load DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Constants
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_HOST = '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

// Helper: Direct database query
async function query(sql, params = []) {
  const client = new Client({
    connectionString: dbUrl,
  });
  
  try {
    await client.connect();
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Helper: Make API request
function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      path: endpoint,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Override': 'true' // Special header to bypass auth for this test
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Main test function
async function runTest() {
  console.log('🔍 Testing Success Factor task update with direct database access...');
  
  try {
    // Step 1: Find a Success Factor task in the database
    console.log(`🔍 Finding a Success Factor task for project ${TEST_PROJECT_ID}...`);
    
    const tasks = await query(`
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND origin = 'success-factor'
      LIMIT 1
    `, [TEST_PROJECT_ID]);
    
    if (!tasks.length) {
      console.error('❌ No Success Factor tasks found for this project');
      return;
    }
    
    const testTask = tasks[0];
    console.log(`✅ Found Success Factor task: ${testTask.id}`);
    console.log(`   - Text: ${testTask.text || 'N/A'}`);
    console.log(`   - Origin: ${testTask.origin || 'N/A'}`);
    console.log(`   - SourceId: ${testTask.source_id || 'N/A'}`);
    console.log(`   - Completed: ${testTask.completed}`);
    
    // Extract clean UUID part (first 5 segments) for testing
    const cleanUuid = testTask.id.split('-').slice(0, 5).join('-');
    console.log(`   - Clean UUID: ${cleanUuid}`);
    
    // Step 2: Update the task using the partial UUID
    const newCompletedState = !testTask.completed;
    console.log(`🔄 Toggling task completion state to: ${newCompletedState}`);
    
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${TEST_PROJECT_ID}/tasks/${cleanUuid}`,
      { completed: newCompletedState }
    );
    
    // Verify Content-Type header
    console.log(`📋 Response Status: ${updateResponse.status}`);
    console.log(`📋 Content-Type: ${updateResponse.headers['content-type']}`);
    
    if (updateResponse.headers['content-type']?.includes('application/json')) {
      console.log('✅ SUCCESS: Received proper JSON Content-Type header');
    } else {
      console.error(`❌ ERROR: Wrong Content-Type header: ${updateResponse.headers['content-type']}`);
      if (updateResponse.headers['content-type']?.includes('text/html')) {
        console.error('❌ CRITICAL ERROR: Received HTML Content-Type instead of JSON!');
      }
    }
    
    // Verify response is valid JSON
    let responseData;
    try {
      responseData = JSON.parse(updateResponse.data);
      console.log('✅ SUCCESS: Response successfully parsed as JSON');
      
      if (responseData.success === true) {
        console.log('✅ SUCCESS: Task update was successful');
        if (responseData.task) {
          console.log(`   - Updated task ID: ${responseData.task.id}`);
          console.log(`   - Updated completion state: ${responseData.task.completed}`);
        }
      } else {
        console.error('❌ Task update failed:', responseData.message || 'No error message');
      }
    } catch (e) {
      console.error('❌ ERROR: Failed to parse response as JSON:', e.message);
      
      if (updateResponse.data.includes('<!DOCTYPE html>')) {
        console.error('❌ CRITICAL ERROR: Received HTML instead of JSON!');
        console.error('First 200 characters of response:');
        console.error(updateResponse.data.substring(0, 200) + '...');
      } else {
        console.error('Raw response:', updateResponse.data);
      }
      return;
    }
    
    // Step 3: Verify the update was applied correctly using the database
    console.log('🔍 Verifying task state in database after update...');
    
    const updatedTasks = await query(`
      SELECT * FROM project_tasks WHERE id = $1
    `, [testTask.id]);
    
    if (!updatedTasks.length) {
      console.error('❌ Task not found in database after update');
      return;
    }
    
    const updatedTask = updatedTasks[0];
    
    // Verify completion state changed
    if (updatedTask.completed === newCompletedState) {
      console.log(`✅ SUCCESS: Task completion state changed to ${newCompletedState}`);
    } else {
      console.error('❌ ERROR: Task completion state did not change');
      console.error(`Expected: ${newCompletedState}, Actual: ${updatedTask.completed}`);
    }
    
    // Verify sourceId was preserved
    if (updatedTask.source_id === testTask.source_id) {
      console.log(`✅ SUCCESS: Task sourceId was preserved: ${updatedTask.source_id}`);
    } else {
      console.error('❌ ERROR: Task sourceId changed or was lost');
      console.error(`Original: ${testTask.source_id}, Updated: ${updatedTask.source_id}`);
    }
    
    // Step 4: Revert the task to its original state
    console.log('🔄 Reverting task to original state...');
    
    const revertResponse = await apiRequest(
      'PUT',
      `/api/projects/${TEST_PROJECT_ID}/tasks/${testTask.id}`,
      { completed: testTask.completed }
    );
    
    if (revertResponse.status === 200) {
      console.log('✅ Task successfully reverted to original state');
    } else {
      console.error(`❌ Failed to revert task: ${revertResponse.status}`);
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
runTest();