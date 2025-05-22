/**
 * Direct Test for Success Factor Task Toggle with Test Auth User
 * 
 * This script:
 * 1. Creates and logs in as the test admin user
 * 2. Uses the authenticated session to toggle a Success Factor task
 * 3. Verifies the response contains the correct updated task with preserved metadata
 * 4. Gets the tasks again to verify persistence
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const SF_TASK_ID = 'a5bdff93-3e7d-4e7c-bea5-1ffb0dc7cdaf';
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

// Test task IDs
const CUSTOM_TASK_ID = '7d8f9a2b-3c4d-5e6f-7g8h-9i0j1k2l3m4n'; 
const VALID_SF_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
const INVALID_SF_TASK_ID = 'invalid-sf-task-id';

console.log('\n=== Task Type Test Parameters ===');
console.log('Custom Task ID:', CUSTOM_TASK_ID);
console.log('Valid SF Task ID:', VALID_SF_TASK_ID);
console.log('Invalid SF Task ID:', INVALID_SF_TASK_ID);

// Main test function
async function testTaskToggle() {
  console.log('=== SUCCESS FACTOR TASK TOGGLE TEST ===\n');
  let cookie = '';
  
  try {
    // Step 1: Reset the test user to ensure it exists
    console.log('Step 1: Ensuring test user exists...');
    execSync('curl -s -X POST http://localhost:5000/api/admin/reset-test-user');
    console.log('Test user reset complete');
    
    // Step 2: Log in as the test user
    console.log('\nStep 2: Logging in as test user...');
    const loginResult = execSync(
      `curl -is -X POST http://localhost:5000/api/login \\
      -H "Content-Type: application/json" \\
      -d '${JSON.stringify(TEST_USER)}'`
    ).toString();
    
    // Extract the cookie from the response
    const cookieMatch = loginResult.match(/set-cookie: ([^;]+)/i);
    if (!cookieMatch) {
      console.error('Failed to obtain session cookie from login response');
      console.error('Login response:');
      console.error(loginResult);
      return;
    }
    
    cookie = cookieMatch[1];
    console.log(`Obtained session cookie: ${cookie}`);
    
    // Step 3: Skip log capture as it's not reliable in the Replit environment
    console.log('\nNote: Skipping log capture, will rely on API responses for verification');
    
    // Step 4: Get all tasks for the project using the authenticated session
    console.log('\nStep 4: Getting all tasks for the project...');
    const tasksOutput = execSync(
      `curl -s -X GET http://localhost:5000/api/projects/${PROJECT_ID}/tasks \\
      -H "Cookie: ${cookie}" \\
      -H "Content-Type: application/json"`
    ).toString();
    
    let tasks;
    try {
      tasks = JSON.parse(tasksOutput);
    } catch (error) {
      console.error('Failed to parse tasks response:');
      console.error(tasksOutput);
      return;
    }
    
    if (!Array.isArray(tasks)) {
      console.error('Expected tasks to be an array, got:', typeof tasks);
      console.error('Response:', tasksOutput);
      return;
    }
    
    console.log(`Found ${tasks.length} tasks in the project`);
console.log('\nTask Type Analysis:');
const customTasks = tasks.filter(t => t.origin === 'custom');
const sfTasks = tasks.filter(t => t.origin === 'factor');
console.log(`- Custom tasks: ${customTasks.length}`);
console.log(`- Success Factor tasks: ${sfTasks.length}`);
console.log(`- Tasks with valid sourceId: ${tasks.filter(t => t.sourceId && isValidUUID(t.sourceId)).length}`);
    
    // Find the target Success Factor task
    let targetTask = tasks.find(task => task.id === SF_TASK_ID);
    
    // If the specific task isn't found, find any Success Factor task
    if (!targetTask) {
      console.log(`Task with ID ${SF_TASK_ID} not found, looking for any Success Factor task...`);
      
      const factorTasks = tasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      if (factorTasks.length === 0) {
        console.error('No Success Factor tasks found in the project');
        return;
      }
      
      targetTask = factorTasks[0];
      console.log(`Using alternative Success Factor task: ${targetTask.id}`);
    }
    
    console.log('\nTarget task:');
    console.log(JSON.stringify({
      id: targetTask.id,
      text: targetTask.text,
      origin: targetTask.origin,
      sourceId: targetTask.sourceId,
      completed: targetTask.completed
    }, null, 2));
    
    // Step 5: Toggle the task completion state
    console.log(`\nStep 5: Toggling task completion from ${targetTask.completed} to ${!targetTask.completed}...`);
    
    const updateOutput = execSync(
      `curl -s -X PUT http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id} \\
      -H "Cookie: ${cookie}" \\
      -H "Content-Type: application/json" \\
      -H "Accept: application/json" \\
      -d '{"completed": ${!targetTask.completed}}'`
    ).toString();
    
    // No need to stop log capture as we skipped it
    
    console.log('\nPUT Response:');
    console.log(updateOutput);
    
    // Parse the update response
    let updateResponse;
    try {
      updateResponse = JSON.parse(updateOutput);
    } catch (error) {
      console.error('Failed to parse update response:');
      console.error(updateOutput);
      return;
    }
    
    if (!updateResponse.success || !updateResponse.task) {
      console.error('Update failed or missing task in response:', updateResponse);
      return;
    }
    
    const updatedTask = updateResponse.task;
    
    // Step 6: Verify response integrity
    console.log('\nStep 6: Verifying response integrity...');
    
    // Check critical fields that must be preserved
    const idMatch = updatedTask.id === targetTask.id;
    const completionToggled = updatedTask.completed !== targetTask.completed;
    const originPreserved = updatedTask.origin === targetTask.origin;
    const sourceIdPreserved = updatedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatch ? '✓' : '✗'} (${updatedTask.id})`);
    console.log(`Completion Toggled: ${completionToggled ? '✓' : '✗'} (${targetTask.completed} → ${updatedTask.completed})`);
    console.log(`Origin Preserved: ${originPreserved ? '✓' : '✗'} (${updatedTask.origin})`);
    console.log(`SourceId Preserved: ${sourceIdPreserved ? '✓' : '✗'} (${updatedTask.sourceId})`);
    
    // Step 7: Get tasks again to verify persistence
    console.log('\nStep 7: Getting tasks again to verify persistence...');
    
    const refreshOutput = execSync(
      `curl -s -X GET http://localhost:5000/api/projects/${PROJECT_ID}/tasks \\
      -H "Cookie: ${cookie}" \\
      -H "Content-Type: application/json"`
    ).toString();
    
    let refreshedTasks;
    try {
      refreshedTasks = JSON.parse(refreshOutput);
    } catch (error) {
      console.error('Failed to parse refreshed tasks response:');
      console.error(refreshOutput);
      return;
    }
    
    const refreshedTask = refreshedTasks.find(task => task.id === targetTask.id);
    
    if (!refreshedTask) {
      console.error('Could not find the task in the refreshed task list');
      return;
    }
    
    console.log('\nRefreshed task state:');
    console.log(JSON.stringify({
      id: refreshedTask.id,
      text: refreshedTask.text,
      origin: refreshedTask.origin,
      sourceId: refreshedTask.sourceId,
      completed: refreshedTask.completed
    }, null, 2));
    
    // Step 8: Verify persistence after refresh
    console.log('\nStep 8: Verifying persistence after refresh...');
    
    const idMatchRefreshed = refreshedTask.id === targetTask.id;
    const completionToggledRefreshed = refreshedTask.completed !== targetTask.completed;
    const originPreservedRefreshed = refreshedTask.origin === targetTask.origin;
    const sourceIdPreservedRefreshed = refreshedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatchRefreshed ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${completionToggledRefreshed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${originPreservedRefreshed ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${sourceIdPreservedRefreshed ? '✓' : '✗'}`);
    
    // Step 9: Reset to original state (cleanup)
    console.log('\nStep 9: Resetting task to original state...');
    execSync(
      `curl -s -X PUT http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id} \\
      -H "Cookie: ${cookie}" \\
      -H "Content-Type: application/json" \\
      -d '{"completed": ${targetTask.completed}}'`
    );
    console.log('Task reset to original state');
    
    // Skip displaying logs since we didn't capture them
    console.log('\nNote: Server logs were not captured, using API responses for verification');
    
    // Get current git commit info
    console.log('\nGit commit information:');
    const gitInfo = execSync('git log -1').toString();
    console.log(gitInfo);
    
    // Test results summary
    console.log('\n=== TEST RESULTS ===');
    
    const responseVerified = idMatch && completionToggled && originPreserved && sourceIdPreserved;
    const persistenceVerified = idMatchRefreshed && completionToggledRefreshed && 
                               originPreservedRefreshed && sourceIdPreservedRefreshed;
    
    console.log(`Response Integrity: ${responseVerified ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Persistence Verification: ${persistenceVerified ? 'PASS ✓' : 'FAIL ✗'}`);
    
    const allPassed = responseVerified && persistenceVerified;
    console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    if (allPassed) {
      console.log('\n✓ SUCCESS FACTOR TASK TOGGLE FIX VERIFIED');
      console.log('The server is correctly returning the user task object with updates.');
      console.log('Task completion state is properly persisted.');
    } else {
      console.log('\n✗ SUCCESS FACTOR TASK TOGGLE FIX NOT VERIFIED');
      console.log('There may still be issues with the task update response or persistence.');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testTaskToggle();