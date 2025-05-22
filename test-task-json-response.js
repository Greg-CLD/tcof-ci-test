/**
 * Test Script for Task Update JSON Response
 * 
 * This script thoroughly tests the task update endpoint to verify:
 * 1. It always returns JSON responses with the proper Content-Type header
 * 2. Success factor task updates correctly preserve the sourceId field
 * 3. Task completion state toggles properly
 * 
 * Run with: node test-task-json-response.js
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configuration
const API_BASE = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Helper: Get session cookie
async function getSessionCookie() {
  try {
    const cookieData = await fs.readFile('./cookies.txt', 'utf8');
    return cookieData.trim();
  } catch (err) {
    console.error('Could not read cookies file:', err.message);
    return '';
  }
}

// Helper: Make API request
async function apiRequest(method, endpoint, body = null) {
  try {
    const cookie = await getSessionCookie();
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookie
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    // First test: Check that Content-Type is application/json
    const contentType = response.headers.get('content-type');
    console.log(`Response Content-Type: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ ERROR: Response Content-Type is not application/json');
      console.error(`Actual Content-Type: ${contentType}`);
    } else {
      console.log('✅ SUCCESS: Response has correct Content-Type: application/json');
    }
    
    // Try to parse as JSON
    let data;
    const text = await response.text();
    
    try {
      data = JSON.parse(text);
      console.log('✅ SUCCESS: Response successfully parsed as JSON');
    } catch (e) {
      console.error('❌ ERROR: Failed to parse response as JSON');
      console.error('Response text:', text.substring(0, 500));
      
      // Check if it's HTML
      if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
        console.error('❌ CRITICAL ERROR: Received HTML instead of JSON!');
      }
      
      throw new Error('Response is not valid JSON');
    }
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data
    };
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

// Main test function
async function runTest() {
  console.log('🔍 Testing task update endpoint for proper JSON responses...');
  
  try {
    // Step 1: Get all tasks for the project
    console.log(`Getting tasks for project ${TEST_PROJECT_ID}...`);
    const tasksResponse = await apiRequest('GET', `/api/projects/${TEST_PROJECT_ID}/tasks`);
    
    if (tasksResponse.status !== 200) {
      console.error(`❌ Failed to get tasks: ${tasksResponse.status}`);
      return;
    }
    
    console.log(`✅ Found ${tasksResponse.data.length} tasks`);
    
    // Find a Success Factor task
    const successFactorTask = tasksResponse.data.find(t => 
      t.origin === 'success-factor' || t.origin === 'factor'
    );
    
    if (!successFactorTask) {
      console.error('❌ No Success Factor task found in project');
      return;
    }
    
    console.log(`✅ Found Success Factor task: ${successFactorTask.id}`);
    console.log(`   - Text: ${successFactorTask.text || 'N/A'}`);
    console.log(`   - Origin: ${successFactorTask.origin || 'N/A'}`);
    console.log(`   - SourceId: ${successFactorTask.sourceId || 'N/A'}`);
    console.log(`   - Completed: ${successFactorTask.completed}`);
    
    // Step 2: Update the task by toggling completion state
    const newCompletedState = !successFactorTask.completed;
    console.log(`Updating task completion state to: ${newCompletedState}`);
    
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${TEST_PROJECT_ID}/tasks/${successFactorTask.id}`,
      { completed: newCompletedState }
    );
    
    if (updateResponse.status !== 200) {
      console.error(`❌ Task update failed with status: ${updateResponse.status}`);
      console.error('Error:', updateResponse.data);
      return;
    }
    
    console.log(`✅ Task update successful with status: ${updateResponse.status}`);
    
    // Verify the response data
    if (updateResponse.data.success === true) {
      console.log('✅ Response indicates update was successful');
    } else {
      console.error('❌ Response indicates update failed');
      console.error('Message:', updateResponse.data.message || 'No error message provided');
      return;
    }
    
    // Step 3: Get the task again to verify update was persisted
    console.log('Verifying update was persisted...');
    const verifyResponse = await apiRequest('GET', `/api/projects/${TEST_PROJECT_ID}/tasks`);
    
    if (verifyResponse.status !== 200) {
      console.error(`❌ Failed to get tasks for verification: ${verifyResponse.status}`);
      return;
    }
    
    // Find the updated task
    const updatedTask = verifyResponse.data.find(t => t.id === successFactorTask.id);
    
    if (!updatedTask) {
      console.error('❌ Could not find task after update');
      return;
    }
    
    // Verify completed state changed
    if (updatedTask.completed === newCompletedState) {
      console.log(`✅ SUCCESS: Task completed state changed to ${newCompletedState}`);
    } else {
      console.error(`❌ ERROR: Task completed state did not change`);
      console.error(`Expected: ${newCompletedState}, Actual: ${updatedTask.completed}`);
    }
    
    // Verify sourceId was preserved
    if (updatedTask.sourceId === successFactorTask.sourceId) {
      console.log(`✅ SUCCESS: Task sourceId was preserved: ${updatedTask.sourceId}`);
    } else {
      console.error(`❌ ERROR: Task sourceId changed or was lost`);
      console.error(`Original: ${successFactorTask.sourceId}, Updated: ${updatedTask.sourceId}`);
    }
    
    // Step 4: Update it back to original state
    console.log('Reverting task to original state...');
    const revertResponse = await apiRequest(
      'PUT',
      `/api/projects/${TEST_PROJECT_ID}/tasks/${successFactorTask.id}`,
      { completed: successFactorTask.completed }
    );
    
    if (revertResponse.status === 200 && revertResponse.data.success === true) {
      console.log('✅ Task successfully reverted to original state');
    } else {
      console.error('❌ Failed to revert task to original state');
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();