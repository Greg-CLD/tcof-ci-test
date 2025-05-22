/**
 * Quick test script to verify task update JSON response
 * 
 * This script sends direct requests to the task update endpoint
 * and verifies that proper JSON responses are returned with the correct Content-Type header.
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Use local server for testing
const USE_LOCAL = false;
const BASE_URL = USE_LOCAL ? 'localhost' : '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const PORT = USE_LOCAL ? 5000 : 443;

// Test data
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TEST_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312'; // Success Factor task

// Get cookies from session
function getCookies() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'cookies.txt'), 'utf8');
    return data.trim();
  } catch (e) {
    console.error('Error reading cookies file:', e.message);
    return '';
  }
}

// HTTP request helper
function request(options, requestBody = null) {
  return new Promise((resolve, reject) => {
    const httpModule = USE_LOCAL ? http : https;
    const req = httpModule.request(options, (res) => {
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
    
    if (requestBody) {
      req.write(JSON.stringify(requestBody));
    }
    
    req.end();
  });
}

// Main test function
async function testJsonResponse() {
  console.log('🔍 Testing task update endpoint for proper JSON responses...');
  console.log(`🔗 Using API endpoint: ${BASE_URL}:${PORT}`);
  
  const cookies = getCookies();
  if (!cookies) {
    console.warn('⚠️ No cookies found - authentication may fail');
  } else {
    console.log('✅ Session cookies loaded');
  }
  
  try {
    // Get the test task
    console.log(`📋 Getting task details for task ${TEST_TASK_ID}`);
    
    const taskResponse = await request({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/projects/${TEST_PROJECT_ID}/tasks`,
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    if (taskResponse.status !== 200) {
      console.error(`❌ Failed to get tasks: ${taskResponse.status}`);
      console.error(taskResponse.data);
      return;
    }
    
    // Parse tasks
    let tasks;
    try {
      tasks = JSON.parse(taskResponse.data);
    } catch (e) {
      console.error('❌ Failed to parse tasks response:', e.message);
      console.error('Response:', taskResponse.data.substring(0, 200) + '...');
      return;
    }
    
    // Find our test task
    const testTask = tasks.find(t => t.id === TEST_TASK_ID);
    if (!testTask) {
      console.error(`❌ Test task ${TEST_TASK_ID} not found in project`);
      return;
    }
    
    console.log(`✅ Found test task: "${testTask.text}" (Completed: ${testTask.completed})`);
    
    // Send task update
    const updateBody = {
      completed: !testTask.completed,
      origin: testTask.origin || 'success-factor'
    };
    
    console.log(`📝 Sending update: ${JSON.stringify(updateBody)}`);
    
    const updateResponse = await request({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`,
      method: 'PUT',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, updateBody);
    
    // Examine response
    console.log(`📊 Response Status: ${updateResponse.status}`);
    console.log(`📊 Content-Type: ${updateResponse.headers['content-type']}`);
    
    if (updateResponse.headers['content-type']?.includes('application/json')) {
      console.log('✅ SUCCESS: Received proper JSON Content-Type header');
    } else {
      console.error(`❌ ERROR: Wrong Content-Type header: ${updateResponse.headers['content-type']}`);
    }
    
    try {
      // Attempt to parse response as JSON
      const responseData = JSON.parse(updateResponse.data);
      console.log('✅ SUCCESS: Response successfully parsed as JSON');
      
      if (responseData.success === true) {
        console.log('✅ SUCCESS: Task update confirmed successful');
        console.log('📊 Task state after update:', responseData.task ? 
          `Completed: ${responseData.task.completed}` : '(Task data not included in response)');
      } else {
        console.warn(`⚠️ Task update returned success: false`);
        console.warn('Message:', responseData.message || 'No message provided');
      }
    } catch (e) {
      console.error('❌ ERROR: Failed to parse response as JSON:', e.message);
      
      // Check if response is HTML
      if (updateResponse.data.includes('<!DOCTYPE html>')) {
        console.error('❌ CRITICAL ERROR: Received HTML instead of JSON!');
        console.error('First 200 characters of response:');
        console.error(updateResponse.data.substring(0, 200) + '...');
      } else {
        console.error('Raw response:', updateResponse.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testJsonResponse();