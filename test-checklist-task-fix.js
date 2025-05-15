/**
 * Script to test the task persistence fixes in the Checklist component
 * This script will:
 * 1. Test creating a task through the API with correct headers
 * 2. Verify task creation by fetching it back
 * 3. Update the task
 * 4. Delete the task
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const API_BASE = 'http://localhost:3000';
const TEST_PROJECT_ID = process.argv[2]; // Pass project ID as command line arg
const AUTH_COOKIE = ''; // Paste your auth cookie here if needed for testing

if (!TEST_PROJECT_ID) {
  console.error('Please provide a project ID as a command line argument');
  console.error('Example: node test-checklist-task-fix.js bc55c1a2-0cdf-4108-aa9e-44b44baea3b8');
  process.exit(1);
}

async function testTaskPersistence() {
  try {
    console.log(`Testing task persistence for project: ${TEST_PROJECT_ID}`);
    
    // Create unique test task data
    const testUuid = uuidv4();
    const timestamp = Date.now();
    const taskData = {
      id: testUuid, // Client-generated ID
      text: `Test Task ${timestamp}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: testUuid,
      completed: false,
      notes: 'Created by persistence test script',
      priority: 'medium',
      status: 'To Do',
      owner: 'Test Script'
    };
    
    // Define headers
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE
    };
    
    // Step 1: Create a new task
    console.log('\n📝 Creating test task...');
    
    const createResponse = await fetch(`${API_BASE}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    });
    
    // Handle response based on status
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create task: ${createResponse.status} - ${errorText}`);
    }
    
    const createdTask = await createResponse.json();
    console.log('✅ Task created successfully:', createdTask);
    
    // Extract actual task ID - handle different response formats
    const taskId = createdTask.task ? createdTask.task.id : createdTask.id;
    if (!taskId) {
      throw new Error('No task ID returned from creation response');
    }
    
    // If server returned a different ID, note the difference
    if (taskId !== testUuid) {
      console.log(`📋 Server assigned different ID: ${taskId} (client had: ${testUuid})`);
    }
    
    // Step 2: Verify task exists
    console.log('\n🔍 Fetching task to verify creation...');
    
    const getResponse = await fetch(`${API_BASE}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      method: 'GET',
      headers
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get tasks: ${getResponse.status}`);
    }
    
    const tasks = await getResponse.json();
    const foundTask = tasks.find(t => t.id === taskId);
    
    if (!foundTask) {
      throw new Error(`Created task with ID ${taskId} not found in response`);
    }
    
    console.log('✅ Task verified in response:', foundTask);
    
    // Step 3: Update the task
    console.log('\n✏️ Updating task...');
    
    const updateData = {
      completed: true,
      notes: 'Updated by persistence test script',
      priority: 'high',
      status: 'Done'
    };
    
    const updateResponse = await fetch(`${API_BASE}/api/projects/${TEST_PROJECT_ID}/tasks/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update task: ${updateResponse.status}`);
    }
    
    console.log('✅ Task updated successfully');
    
    // Step 4: Verify the update
    console.log('\n🔍 Fetching task to verify update...');
    
    const getUpdatedResponse = await fetch(`${API_BASE}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      method: 'GET',
      headers
    });
    
    if (!getUpdatedResponse.ok) {
      throw new Error(`Failed to get tasks: ${getUpdatedResponse.status}`);
    }
    
    const updatedTasks = await getUpdatedResponse.json();
    const updatedTask = updatedTasks.find(t => t.id === taskId);
    
    if (!updatedTask) {
      throw new Error(`Updated task with ID ${taskId} not found in response`);
    }
    
    if (!updatedTask.completed) {
      throw new Error('Task not marked as completed in response');
    }
    
    console.log('✅ Update verified:', updatedTask);
    
    // Step 5: Delete the task
    console.log('\n🗑️ Deleting task...');
    
    const deleteResponse = await fetch(`${API_BASE}/api/projects/${TEST_PROJECT_ID}/tasks/${taskId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete task: ${deleteResponse.status}`);
    }
    
    console.log('✅ Task deleted successfully');
    
    // Step 6: Verify deletion
    console.log('\n🔍 Fetching tasks to verify deletion...');
    
    const getFinalResponse = await fetch(`${API_BASE}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      method: 'GET',
      headers
    });
    
    if (!getFinalResponse.ok) {
      throw new Error(`Failed to get tasks: ${getFinalResponse.status}`);
    }
    
    const finalTasks = await getFinalResponse.json();
    const shouldNotExist = finalTasks.find(t => t.id === taskId);
    
    if (shouldNotExist) {
      throw new Error(`Task was not deleted, still found with ID ${taskId}`);
    }
    
    console.log('✅ Deletion verified - Task no longer exists');
    
    // All steps completed successfully
    console.log('\n✅✅✅ Task persistence test completed successfully! All operations verified.');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testTaskPersistence();