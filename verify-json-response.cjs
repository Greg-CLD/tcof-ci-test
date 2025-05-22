/**
 * Final Verification for Task Update JSON Response
 *
 * This script performs a focused test on the task update endpoint to verify:
 * 1. It returns proper JSON responses with application/json Content-Type
 * 2. Success Factor task updates preserve the sourceId field
 * 3. Task completion state can be toggled
 */

const https = require('https');
const fs = require('fs');

// Configuration
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TEST_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312'; // Success Factor task

// Helper: Get session cookie from file
function getSessionCookie() {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (err) {
    console.error('Could not read cookies file:', err.message);
    return '';
  }
}

// Helper: Make HTTPS request
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
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
async function verifyJsonResponse() {
  console.log('🔍 Verifying JSON response from task update endpoint...');
  
  const cookie = getSessionCookie();
  if (!cookie) {
    console.warn('⚠️ No session cookie found - authentication may fail');
  } else {
    console.log('✅ Session cookie loaded');
  }
  
  try {
    // Step 1: Get current task state
    console.log(`🔍 Getting current state of task ${TEST_TASK_ID}...`);
    
    const tasksResponse = await makeRequest({
      hostname: '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev',
      path: `/api/projects/${TEST_PROJECT_ID}/tasks`,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    });
    
    if (tasksResponse.status !== 200) {
      console.error(`❌ Failed to get tasks: ${tasksResponse.status}`);
      console.error(tasksResponse.data);
      return;
    }
    
    let tasks;
    try {
      tasks = JSON.parse(tasksResponse.data);
    } catch (e) {
      console.error('❌ Failed to parse tasks response as JSON:', e.message);
      return;
    }
    
    // Find our test task
    const testTask = tasks.find(t => t.id === TEST_TASK_ID);
    if (!testTask) {
      console.error(`❌ Test task ${TEST_TASK_ID} not found in project`);
      return;
    }
    
    console.log(`✅ Found test task: "${testTask.text}" (Completed: ${testTask.completed})`);
    console.log(`   Source ID: ${testTask.sourceId || 'N/A'}`);
    
    // Step 2: Toggle task completion state
    const newCompletedState = !testTask.completed;
    
    console.log(`🔄 Toggling task completion state to: ${newCompletedState}`);
    
    const updateResponse = await makeRequest({
      hostname: '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev',
      path: `/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`,
      method: 'PUT',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, {
      completed: newCompletedState
    });
    
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
      } else {
        console.error('❌ Task update failed:', responseData.message || 'No error message');
      }
    } catch (e) {
      console.error('❌ ERROR: Failed to parse response as JSON:', e.message);
      
      // Check if it's HTML
      if (updateResponse.data.includes('<!DOCTYPE html>')) {
        console.error('❌ CRITICAL ERROR: Received HTML instead of JSON!');
        console.error('First 200 characters of response:');
        console.error(updateResponse.data.substring(0, 200) + '...');
      } else {
        console.error('Raw response:', updateResponse.data);
      }
      return;
    }
    
    // Step 3: Verify the update was applied correctly by getting the task again
    console.log('🔍 Verifying task state after update...');
    
    const verifyResponse = await makeRequest({
      hostname: '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev',
      path: `/api/projects/${TEST_PROJECT_ID}/tasks`,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    });
    
    if (verifyResponse.status !== 200) {
      console.error(`❌ Failed to verify task state: ${verifyResponse.status}`);
      return;
    }
    
    let updatedTasks;
    try {
      updatedTasks = JSON.parse(verifyResponse.data);
    } catch (e) {
      console.error('❌ Failed to parse verification response as JSON:', e.message);
      return;
    }
    
    // Find our updated task
    const updatedTask = updatedTasks.find(t => t.id === TEST_TASK_ID);
    if (!updatedTask) {
      console.error('❌ Task not found after update');
      return;
    }
    
    // Verify completion state changed
    if (updatedTask.completed === newCompletedState) {
      console.log(`✅ SUCCESS: Task completion state changed to ${newCompletedState}`);
    } else {
      console.error('❌ ERROR: Task completion state did not change');
      console.error(`Expected: ${newCompletedState}, Actual: ${updatedTask.completed}`);
    }
    
    // Verify sourceId was preserved
    if (updatedTask.sourceId === testTask.sourceId) {
      console.log(`✅ SUCCESS: Task sourceId was preserved: ${updatedTask.sourceId}`);
    } else {
      console.error('❌ ERROR: Task sourceId changed or was lost');
      console.error(`Original: ${testTask.sourceId}, Updated: ${updatedTask.sourceId}`);
    }
    
    // Step 4: Revert the task to its original state
    console.log('🔄 Reverting task to original state...');
    
    const revertResponse = await makeRequest({
      hostname: '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev',
      path: `/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`,
      method: 'PUT',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    }, {
      completed: testTask.completed
    });
    
    if (revertResponse.status === 200) {
      console.log('✅ Task successfully reverted to original state');
    } else {
      console.error(`❌ Failed to revert task: ${revertResponse.status}`);
    }
    
    console.log('🎉 Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
  }
}

// Run the verification
verifyJsonResponse();