/**
 * Test script to verify the enhanced task lookup functionality
 * 
 * This script tests the improved task lookup mechanism for Success-Factor tasks,
 * specifically checking if the update endpoint can handle different ID formats.
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Get session cookie for authentication
function getCookies() {
  try {
    const cookies = fs.readFileSync('./cookies.txt', 'utf8').trim();
    return cookies;
  } catch (error) {
    console.error('Error reading cookies file:', error.message);
    console.log('Please run extract-session-cookie.js first to get valid authentication');
    process.exit(1);
  }
}

// API request helper
async function apiRequest(method, endpoint, body = null) {
  const baseUrl = 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  
  // Get cookies for authentication
  const cookies = getCookies();
  
  // Prepare request options
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    }
  };
  
  // Add body for POST/PUT requests
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  try {
    // Make the request
    const response = await fetch(url, options);
    
    // Parse response as JSON
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Error parsing response as JSON:', error);
      console.log('Raw response:', await response.text());
      throw new Error('Invalid JSON response');
    }
    
    // Return formatted result
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    return {
      status: 0,
      data: null,
      ok: false,
      error: error.message
    };
  }
}

/**
 * Test the task update functionality with different ID formats
 */
async function testEnhancedTaskLookup() {
  console.log('=== Testing Enhanced Task Lookup Functionality ===');
  
  // Step 1: Get first project
  console.log('\n1. Getting a test project...');
  const projectsResponse = await apiRequest('GET', '/api/projects');
  
  if (!projectsResponse.ok || !projectsResponse.data.length) {
    console.error('Failed to get projects or no projects found');
    return;
  }
  
  const projectId = projectsResponse.data[0].id;
  console.log(`Using project ID: ${projectId}`);
  
  // Step 2: Get tasks for this project
  console.log('\n2. Getting tasks for the project...');
  const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!tasksResponse.ok || !tasksResponse.data.length) {
    console.error('Failed to get tasks or no tasks found for this project');
    return;
  }
  
  // Find a Success-Factor task
  const successFactorTask = tasksResponse.data.find(task => 
    task.origin === 'success-factor' || task.origin === 'factor'
  );
  
  if (!successFactorTask) {
    console.log('No Success-Factor tasks found. Creating a test task...');
    
    // Create a test success factor task
    const newTaskResponse = await apiRequest('POST', `/api/projects/${projectId}/tasks`, {
      text: 'Test Success Factor Task',
      origin: 'success-factor',
      completed: false,
      stage: 'identification'
    });
    
    if (!newTaskResponse.ok) {
      console.error('Failed to create test task');
      return;
    }
    
    console.log('Test task created successfully');
    successFactorTask = newTaskResponse.data;
  }
  
  console.log(`Found Success-Factor task: ${successFactorTask.id}`);
  console.log(`Current completion state: ${successFactorTask.completed}`);
  
  // Step 3: Test updating the task with the full ID
  console.log('\n3. Testing task update with full ID...');
  const fullIdUpdateResponse = await apiRequest('PUT', 
    `/api/projects/${projectId}/tasks/${successFactorTask.id}`,
    { completed: !successFactorTask.completed }
  );
  
  console.log('Full ID update response:', {
    status: fullIdUpdateResponse.status,
    success: fullIdUpdateResponse.ok,
    message: fullIdUpdateResponse.data?.message || 'No message'
  });
  
  if (fullIdUpdateResponse.ok) {
    console.log('✅ Successfully updated task with full ID');
  } else {
    console.log('❌ Failed to update task with full ID');
  }
  
  // Step 4: Extract the UUID part (first 5 segments) for testing
  const uuidPart = successFactorTask.id.split('-').slice(0, 5).join('-');
  
  // Only proceed if the task has a compound ID
  if (uuidPart !== successFactorTask.id) {
    console.log(`\n4. Testing task update with UUID part: ${uuidPart}`);
    
    const uuidUpdateResponse = await apiRequest('PUT',
      `/api/projects/${projectId}/tasks/${uuidPart}`,
      { completed: !fullIdUpdateResponse.data.completed }
    );
    
    console.log('UUID part update response:', {
      status: uuidUpdateResponse.status,
      success: uuidUpdateResponse.ok,
      message: uuidUpdateResponse.data?.message || 'No message'
    });
    
    if (uuidUpdateResponse.ok) {
      console.log('✅ Successfully updated task with UUID part');
    } else {
      console.log('❌ Failed to update task with UUID part');
    }
  } else {
    console.log('\n4. Task does not have a compound ID, skipping UUID part test');
  }
  
  // Step 5: Verify the final state
  console.log('\n5. Verifying final task state...');
  const finalTaskResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!finalTaskResponse.ok) {
    console.error('Failed to get final task state');
    return;
  }
  
  const updatedTask = finalTaskResponse.data.find(task => task.id === successFactorTask.id);
  
  if (updatedTask) {
    console.log(`Final task state - completed: ${updatedTask.completed}`);
    console.log('✅ Task verification successful');
  } else {
    console.log('❌ Could not find task in final state check');
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testEnhancedTaskLookup().catch(error => {
  console.error('Test failed with error:', error);
});