/**
 * Simple test script to verify TASK_LOOKUP debug logging
 * 
 * This script:
 * 1. Gets all tasks for a test project
 * 2. Tests updating a task with both full ID and clean UUID
 * 3. Verifies the debug logs are being generated properly
 */

import fetch from 'node-fetch';

// Target project ID - change if needed
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Helper function for API requests
const apiRequest = async (method, url, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`Sending ${method} request to ${url}`);
  const response = await fetch(`http://localhost:5000${url}`, options);
  return response;
};

// Main test function
const runTest = async () => {
  console.log('========== TASK_LOOKUP Debug Test ==========');
  
  try {
    // Step 1: Get all tasks for the project
    console.log(`\nStep 1: Getting tasks for project ${PROJECT_ID}...`);
    const tasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to get tasks: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.length} tasks.`);
    
    if (tasks.length === 0) {
      // Create a test task if none exist
      console.log('\nNo tasks found. Creating a test task...');
      const newTask = {
        text: 'Test task for TASK_LOOKUP debugging',
        stage: 'Identification',
        origin: 'test',
        source: 'test',
        completed: false
      };
      
      const createResponse = await apiRequest(
        'POST', 
        `/api/projects/${PROJECT_ID}/tasks`, 
        newTask
      );
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create task: ${createResponse.status}`);
      }
      
      const createdTask = await createResponse.json();
      console.log(`Created test task with ID: ${createdTask.id}`);
      tasks.push(createdTask);
    }
    
    // Use the first task for our test
    const testTask = tasks[0];
    console.log(`\nUsing task for testing: "${testTask.text}" (ID: ${testTask.id})`);
    
    // Step 2: Test updating with full ID
    console.log('\nStep 2: Testing update with full ID...');
    console.log('This should trigger [TASK_LOOKUP] with matchedVia: "exact"');
    
    const updateData = { completed: !testTask.completed };
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      updateData
    );
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update task: ${updateResponse.status}`);
    }
    
    console.log(`Task updated successfully! New completed status: ${!testTask.completed}`);
    console.log('Check server logs for [TASK_LOOKUP] output with matchedVia: "exact"');
    
    // Step 3: Test updating with clean UUID
    if (testTask.id.includes('-')) {
      const cleanUuid = testTask.id.split('-').slice(0, 5).join('-');
      console.log('\nStep 3: Testing update with clean UUID...');
      console.log(`Using clean UUID: ${cleanUuid}`);
      console.log('This should trigger [TASK_LOOKUP] with matchedVia: "prefix"');
      
      const updateResponse2 = await apiRequest(
        'PUT',
        `/api/projects/${PROJECT_ID}/tasks/${cleanUuid}`,
        { completed: testTask.completed } // Toggle back to original
      );
      
      if (!updateResponse2.ok) {
        throw new Error(`Failed to update task with clean UUID: ${updateResponse2.status}`);
      }
      
      console.log('Task updated successfully using clean UUID!');
      console.log('Check server logs for [TASK_LOOKUP] output with matchedVia: "prefix"');
    } else {
      console.log('\nSkipping clean UUID test - task ID is not a UUID format');
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('Check the server logs to confirm [TASK_LOOKUP] debug output is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
};

// Run the test
runTest();