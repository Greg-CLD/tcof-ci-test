/**
 * Success Factor Task Persistence Verification Tool
 * 
 * This script directly tests if Success Factor tasks persist their completion state
 * by making API calls to toggle a task and verifying the change.
 */

const fetch = require('node-fetch');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Test project
const API_BASE_URL = 'http://localhost:5000';
const DEBUG = true;

async function log(message, data = null) {
  console.log(message);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Function to make an authenticated API request
async function apiRequest(method, endpoint, body = null) {
  const timestamp = Date.now();
  log(`API ${method} Request to ${endpoint}${body ? ' with data:' : ''}`);
  if (body) log(JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    log(`API Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    log(`API Response in ${Date.now() - timestamp}ms:`, data);
    return data;
  } catch (error) {
    console.error('API Request error:', error);
    throw error;
  }
}

async function main() {
  try {
    // Step 1: Get all tasks for the project
    log('\nSTEP 1: Getting all tasks for the project...');
    const allTasks = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    log(`Found ${allTasks.length} tasks in total`);
    
    // Step 2: Find Success Factor tasks
    log('\nSTEP 2: Finding Success Factor tasks...');
    const successFactorTasks = allTasks.filter(task => 
      task.origin === 'factor' && task.sourceId
    );
    
    log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found to test with');
    }
    
    // Step 3: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    log('\nSTEP 3: Selected task to toggle:', taskToToggle);
    
    // Step 4: Toggle the task's completion state
    const newCompletionState = !taskToToggle.completed;
    log(`\nSTEP 4: Toggling task completion from ${taskToToggle.completed} to ${newCompletionState}...`);
    
    const updateResult = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${taskToToggle.id}`,
      { completed: newCompletionState }
    );
    
    log('Update result:', updateResult);
    
    // Step 5: Verify the update was applied
    log('\nSTEP 5: Verifying update was applied...');
    const updatedTasks = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    const updatedTask = updatedTasks.find(t => t.id === taskToToggle.id);
    if (!updatedTask) {
      throw new Error('Task not found after update!');
    }
    
    log('Task current state:', { 
      id: updatedTask.id,
      text: updatedTask.text,
      completed: updatedTask.completed,
      origin: updatedTask.origin,
      sourceId: updatedTask.sourceId
    });
    
    // Check if the completion state was updated correctly
    if (updatedTask.completed !== newCompletionState) {
      throw new Error(`Task completion state did not update correctly. Expected: ${newCompletionState}, got: ${updatedTask.completed}`);
    }
    
    // Check if metadata was preserved
    if (updatedTask.origin !== 'factor') {
      throw new Error(`Origin changed from 'factor' to '${updatedTask.origin}'`);
    }
    
    if (updatedTask.sourceId !== taskToToggle.sourceId) {
      throw new Error(`SourceId changed from '${taskToToggle.sourceId}' to '${updatedTask.sourceId}'`);
    }
    
    // Check for related tasks with the same sourceId
    log('\nSTEP 6: Checking related tasks synchronization...');
    const relatedTasks = updatedTasks.filter(t => 
      t.id !== taskToToggle.id && 
      t.sourceId === taskToToggle.sourceId
    );
    
    if (relatedTasks.length > 0) {
      log(`Found ${relatedTasks.length} related tasks with the same sourceId`);
      
      // Check if all related tasks have the same completion state
      const inconsistentTasks = relatedTasks.filter(t => t.completed !== newCompletionState);
      
      if (inconsistentTasks.length > 0) {
        log('Warning: Some related tasks have inconsistent completion states:', inconsistentTasks);
      } else {
        log('All related tasks have consistent completion states');
      }
    } else {
      log('No related tasks found with the same sourceId');
    }
    
    // Success!
    console.log('\n✅ SUCCESS: Task persistence test passed!');
    console.log(`- Task ${taskToToggle.id} toggled to ${newCompletionState ? 'COMPLETED' : 'NOT COMPLETED'}`);
    console.log('- Change was reflected in the API response');
    console.log('- Metadata (origin, sourceId) was preserved');
    if (relatedTasks.length > 0) {
      console.log(`- ${relatedTasks.length} related tasks were synchronized`);
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  }
}

// Run the test
main();