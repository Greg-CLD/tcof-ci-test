/**
 * Direct Success Factor Task Toggle Test
 * 
 * This script directly tests the task toggle functionality using the API:
 * 1. Gets a list of Success Factor tasks
 * 2. Toggles the completion state of one task
 * 3. Verifies the update persisted and maintained proper metadata
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_URL = 'http://localhost:3000/api';

// Main test function
async function testSuccessFactorTaskToggle() {
  console.log('=== Success Factor Task Toggle Persistence Test ===\n');
  
  try {
    // Create a session - this part would normally use browser cookies
    // but for testing purposes we'll set up a direct API request
    console.log('Setting up authenticated session...');
    
    // Step 1: Get all tasks for the project
    console.log('\nSTEP 1: Getting all tasks for the project...');
    const tasksResponse = await fetch(`${API_URL}/projects/${PROJECT_ID}/tasks`);
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.length} tasks in the project\n`);
    
    // Step 2: Find a task with origin = 'factor' to test with
    console.log('\nSTEP 2: Finding a Success Factor task to test with...');
    const factorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      throw new Error('No Success Factor tasks found for testing');
    }
    
    // Select the first factor task for testing
    const testTask = factorTasks[0];
    console.log('\nSelected Success Factor task for testing:');
    console.log(JSON.stringify({
      id: testTask.id,
      text: testTask.text,
      origin: testTask.origin,
      sourceId: testTask.sourceId,
      completed: testTask.completed
    }, null, 2));
    
    // Save original state for verification
    const originalState = {
      id: testTask.id,
      completed: testTask.completed,
      origin: testTask.origin,
      sourceId: testTask.sourceId
    };
    
    // Step 3: Toggle the task's completion state
    console.log(`\nSTEP 3: Toggling task completion from ${testTask.completed} to ${!testTask.completed}...`);
    const updateResponse = await fetch(
      `${API_URL}/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed: !testTask.completed
        })
      }
    );
    
    // Check response headers for proper content type
    const contentType = updateResponse.headers.get('content-type');
    console.log(`Response Content-Type: ${contentType}`);
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update task: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updatedTask = await updateResponse.json();
    console.log('\nServer response after update:');
    console.log(JSON.stringify({
      id: updatedTask.id,
      text: updatedTask.text,
      origin: updatedTask.origin,
      sourceId: updatedTask.sourceId,
      completed: updatedTask.completed
    }, null, 2));
    
    // Step 4: Verify the update was successful
    console.log('\nSTEP 4: Verifying update integrity...');
    const updateSuccessful = 
      updatedTask.id === originalState.id &&
      updatedTask.completed !== originalState.completed &&
      updatedTask.origin === originalState.origin &&
      updatedTask.sourceId === originalState.sourceId;
    
    console.log(`ID Preserved: ${updatedTask.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${updatedTask.completed !== originalState.completed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${updatedTask.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${updatedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 5: Fetch the task list again to verify persistence
    console.log('\nSTEP 5: Fetching task list again to verify persistence...');
    const refreshResponse = await fetch(`${API_URL}/projects/${PROJECT_ID}/tasks`);
    
    if (!refreshResponse.ok) {
      throw new Error(`Failed to refresh tasks: ${refreshResponse.status} ${refreshResponse.statusText}`);
    }
    
    const refreshedTasks = await refreshResponse.json();
    const refreshedTask = refreshedTasks.find(t => t.id === testTask.id);
    
    if (!refreshedTask) {
      throw new Error('Could not find the test task in the refreshed task list');
    }
    
    console.log('\nTask state after refresh:');
    console.log(JSON.stringify({
      id: refreshedTask.id,
      text: refreshedTask.text,
      origin: refreshedTask.origin,
      sourceId: refreshedTask.sourceId,
      completed: refreshedTask.completed
    }, null, 2));
    
    // Step 6: Verify persistence after refresh
    console.log('\nSTEP 6: Verifying persistence after refresh...');
    const persistenceVerified = 
      refreshedTask.id === originalState.id &&
      refreshedTask.completed !== originalState.completed &&
      refreshedTask.origin === originalState.origin &&
      refreshedTask.sourceId === originalState.sourceId;
    
    console.log(`ID Preserved: ${refreshedTask.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${refreshedTask.completed !== originalState.completed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${refreshedTask.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${refreshedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 7: Toggle back to original state (cleanup)
    console.log('\nSTEP 7: Cleaning up - toggling task back to original state...');
    const cleanupResponse = await fetch(
      `${API_URL}/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed: originalState.completed
        })
      }
    );
    
    if (!cleanupResponse.ok) {
      console.warn('Warning: Failed to reset task to original state');
    } else {
      console.log('Task reset to original state successfully');
    }
    
    // Final results
    console.log('\n=== Test Results ===');
    console.log(`Update Success: ${updateSuccessful ? '✓' : '✗'}`);
    console.log(`Persistence Verified: ${persistenceVerified ? '✓' : '✗'}`);
    console.log(`Content Type Validation: ${contentType && contentType.includes('application/json') ? '✓' : '✗'}`);
    console.log(`Overall Test Result: ${updateSuccessful && persistenceVerified && contentType && contentType.includes('application/json') ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testSuccessFactorTaskToggle();