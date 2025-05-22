/**
 * Success Factor Task Toggle Test
 * 
 * This script provides a real-world test for Success Factor task persistence by:
 * 1. Finding a factor-origin task via the API
 * 2. Capturing its initial state (including origin and sourceId)
 * 3. Toggling its completion state
 * 4. Verifying the toggle worked and origin/sourceId remained intact
 * 5. Retrieving the task list again to confirm persistence
 */

require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const API_BASE = 'http://localhost:3000/api';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Helper function to get active session cookie
function getCookieFromFile() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      return fs.readFileSync('./cookies.txt', 'utf8').trim();
    }
    if (fs.existsSync('./current-session.txt')) {
      return fs.readFileSync('./current-session.txt', 'utf8').trim();
    }
    console.error('No cookie file found. Please run extract-session-cookie.js first.');
    return null;
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return null;
  }
}

// Helper function to make authenticated API requests
async function apiRequest(method, endpoint, body = null) {
  const cookie = getCookieFromFile();
  if (!cookie) {
    throw new Error('No authentication cookie available');
  }
  
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Check if response is OK
    if (!response.ok) {
      console.error(`API Error (${response.status}): ${await response.text()}`);
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Check for JSON content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Non-JSON response: ${contentType}`);
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error during API request:', error);
    throw error;
  }
}

// Helper to clean up console output for display
function formatJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// Helper to get only the task relevant fields for comparison
function getTaskEssentials(task) {
  return {
    id: task.id,
    text: task.text,
    origin: task.origin,
    source: task.source,
    sourceId: task.sourceId,
    completed: task.completed,
    stage: task.stage
  };
}

// Main test function
async function runTest() {
  console.log('=== Success Factor Task Toggle Test ===\n');
  
  try {
    // Step 1: Get all tasks for the project
    console.log(`Getting tasks for project ${PROJECT_ID}...`);
    const allTasks = await apiRequest('GET', `/projects/${PROJECT_ID}/tasks`);
    console.log(`Found ${allTasks.length} tasks in the project\n`);
    
    // Step 2: Find a factor-origin task for testing
    const factorTasks = allTasks.filter(task => 
      (task.origin === 'factor' || task.origin === 'success-factor') && 
      !task.completed // Preferably find one that's not completed yet
    );
    
    if (factorTasks.length === 0) {
      console.log('No suitable factor tasks found for testing. Looking for completed ones instead...');
      const completedFactorTasks = allTasks.filter(task => 
        (task.origin === 'factor' || task.origin === 'success-factor')
      );
      
      if (completedFactorTasks.length === 0) {
        throw new Error('No factor-origin tasks found for testing');
      }
      
      factorTasks.push(completedFactorTasks[0]);
    }
    
    // Select a task to test with
    const testTask = factorTasks[0];
    console.log('Selected test task:');
    console.log(formatJson(getTaskEssentials(testTask)));
    
    // Save initial state for later comparison
    const initialState = {
      id: testTask.id,
      completed: testTask.completed,
      origin: testTask.origin,
      sourceId: testTask.sourceId
    };
    
    // Step 3: Toggle completion state
    console.log(`\nToggling completion state from ${testTask.completed} to ${!testTask.completed}...`);
    
    // Start capturing server logs
    console.log('\nCapturing server logs...');
    const timestamp = Date.now();
    try {
      execSync(`tail -100 -f .replit/logs/console.log > toggle_logs_${timestamp}.txt &`);
      console.log(`Log capture started in toggle_logs_${timestamp}.txt`);
    } catch (err) {
      console.log('Note: Log capture setup failed, continuing with test');
    }
    
    const updateResponse = await apiRequest('PUT', 
      `/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: !testTask.completed }
    );
    
    console.log('Update response:');
    console.log(formatJson(getTaskEssentials(updateResponse)));
    
    // Step 4: Verify fields remained correct after update
    console.log('\nVerifying field integrity after update:');
    console.log(`ID Match: ${updateResponse.id === initialState.id ? 'YES' : 'NO'}`);
    console.log(`Completion Toggled: ${updateResponse.completed !== initialState.completed ? 'YES' : 'NO'}`);
    console.log(`Origin Preserved: ${updateResponse.origin === initialState.origin ? 'YES' : 'NO'}`);
    console.log(`SourceId Preserved: ${updateResponse.sourceId === initialState.sourceId ? 'YES' : 'NO'}`);
    
    // Step 5: Get tasks again to verify persistence
    console.log('\nFetching all tasks again to verify persistence...');
    const refreshedTasks = await apiRequest('GET', `/projects/${PROJECT_ID}/tasks`);
    
    // Find our test task in the refreshed list
    const refreshedTask = refreshedTasks.find(task => task.id === testTask.id);
    if (!refreshedTask) {
      throw new Error('Could not find test task after refresh');
    }
    
    console.log('Refreshed task state:');
    console.log(formatJson(getTaskEssentials(refreshedTask)));
    
    // Step 6: Verify the update persisted after refresh
    console.log('\nVerifying persistence after refresh:');
    console.log(`ID Match: ${refreshedTask.id === initialState.id ? 'YES' : 'NO'}`);
    console.log(`Completion State Updated: ${refreshedTask.completed !== initialState.completed ? 'YES' : 'NO'}`);
    console.log(`Origin Preserved: ${refreshedTask.origin === initialState.origin ? 'YES' : 'NO'}`);
    console.log(`SourceId Preserved: ${refreshedTask.sourceId === initialState.sourceId ? 'YES' : 'NO'}`);
    
    // Final result
    const success = 
      refreshedTask.id === initialState.id &&
      refreshedTask.completed !== initialState.completed &&
      refreshedTask.origin === initialState.origin &&
      refreshedTask.sourceId === initialState.sourceId;
    
    console.log(`\nOverall Test Result: ${success ? 'SUCCESS' : 'FAILURE'}`);
    
    // Try to kill log capture process
    try {
      execSync('pkill -f "tail -100 -f .replit/logs/console.log" || true');
    } catch (err) {
      console.log('Note: Could not kill log capture process');
    }
    
    // Step 7: Toggle back to original state (cleanup)
    console.log('\nToggling task back to original state for cleanup...');
    const cleanupResponse = await apiRequest('PUT', 
      `/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: initialState.completed }
    );
    
    console.log(`Cleanup completed. Task returned to ${initialState.completed ? 'completed' : 'incomplete'} state.`);
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\nTest failed with error:', error);
    process.exit(1);
  }
}

// Run the test
runTest();