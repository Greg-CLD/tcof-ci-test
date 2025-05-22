/**
 * Simple Success Factor Task Toggle Test
 * 
 * This script performs a direct test of the Success Factor task toggle functionality
 * using direct API calls with the X-Auth-Override header to bypass authentication.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TARGET_SF_TASK_ID = 'a5bdff93-3e7d-4e7c-bea5-1ffb0dc7cdaf';
const PORT = 5000;
const URL_BASE = `http://localhost:${PORT}`;

// Main test function
async function testTaskToggle() {
  try {
    console.log('=== SUCCESS FACTOR TASK TOGGLE TEST ===\n');
    
    // Step 1: Get all tasks for the project
    console.log('Step 1: Getting all tasks for the project...');
    
    const tasksCmd = 
      `curl -s -X GET "${URL_BASE}/api/projects/${PROJECT_ID}/tasks" \\
      -H "X-Auth-Override: admin" \\
      -H "X-Auth-User-Id: admin" \\
      -H "Content-Type: application/json"`;
    
    const tasksRaw = execSync(tasksCmd).toString();
    
    // Check if we got JSON or some error
    if (!tasksRaw || !tasksRaw.trim().startsWith('[')) {
      console.error('Error: Failed to get tasks list. Response was:');
      console.error(tasksRaw);
      return;
    }
    
    // Parse tasks
    const tasks = JSON.parse(tasksRaw);
    console.log(`Found ${tasks.length} tasks for the project`);
    
    // Find our target task
    let targetTask = tasks.find(task => task.id === TARGET_SF_TASK_ID);
    
    // If that specific task isn't found, look for any success factor task
    if (!targetTask) {
      console.log(`Task with ID ${TARGET_SF_TASK_ID} not found, looking for any Success Factor task...`);
      
      // Get all success factor tasks
      const factorTasks = tasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      if (factorTasks.length === 0) {
        console.error('No Success Factor tasks found in this project');
        return;
      }
      
      targetTask = factorTasks[0];
      console.log(`Using alternative Success Factor task with ID: ${targetTask.id}`);
    }
    
    console.log('Target task:');
    console.log(JSON.stringify(targetTask, null, 2));
    
    // Record original state for comparison
    const originalState = {
      id: targetTask.id,
      completed: targetTask.completed,
      origin: targetTask.origin,
      sourceId: targetTask.sourceId
    };
    
    // Step A: Start log capture
    console.log('\nStarting server log capture...');
    execSync('tail -f .replit/logs/console.log > server-logs.txt & echo $! > logpid.txt');
    
    // Give time for log capture to start
    execSync('sleep 1');
    
    // Step 2: Toggle the task completion state
    console.log(`\nStep 2: Toggling task completion from ${targetTask.completed} to ${!targetTask.completed}...`);
    
    const updateCmd = 
      `curl -s -X PUT "${URL_BASE}/api/projects/${PROJECT_ID}/tasks/${targetTask.id}" \\
      -H "X-Auth-Override: admin" \\
      -H "X-Auth-User-Id: admin" \\
      -H "Content-Type: application/json" \\
      -H "Accept: application/json" \\
      -d '{"completed": ${!targetTask.completed}}'`;
    
    console.log('Executing update command...');
    const updateRaw = execSync(updateCmd).toString();
    
    // Stop log capture
    const logPid = fs.readFileSync('logpid.txt', 'utf8').trim();
    execSync(`kill ${logPid}`);
    console.log('Stopped log capture');
    
    console.log('\nPUT Response:');
    console.log(updateRaw);
    
    // Parse update response
    let updateResponse;
    try {
      updateResponse = JSON.parse(updateRaw);
    } catch (error) {
      console.error('Error parsing update response:');
      console.error('Raw response:', updateRaw);
      return;
    }
    
    // Check response structure
    if (!updateResponse.success || !updateResponse.task) {
      console.error('Update failed or response missing task object:', updateResponse);
      return;
    }
    
    const updatedTask = updateResponse.task;
    
    // Step 3: Verify response integrity
    console.log('\nStep 3: Verifying response integrity...');
    
    // Check critical fields
    const idMatch = updatedTask.id === targetTask.id;
    const completionToggled = updatedTask.completed !== targetTask.completed;
    const originPreserved = updatedTask.origin === targetTask.origin;
    const sourceIdPreserved = updatedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatch ? '✓' : '✗'} (${updatedTask.id})`);
    console.log(`Completion Toggled: ${completionToggled ? '✓' : '✗'} (${targetTask.completed} → ${updatedTask.completed})`);
    console.log(`Origin Preserved: ${originPreserved ? '✓' : '✗'} (${updatedTask.origin})`);
    console.log(`SourceId Preserved: ${sourceIdPreserved ? '✓' : '✗'} (${updatedTask.sourceId})`);
    
    // Step 4: Get tasks again to verify persistence
    console.log('\nStep 4: Getting tasks again to verify persistence...');
    
    const refreshRaw = execSync(tasksCmd).toString();
    const refreshedTasks = JSON.parse(refreshRaw);
    
    const refreshedTask = refreshedTasks.find(task => task.id === targetTask.id);
    
    if (!refreshedTask) {
      console.error('Could not find the task in the refreshed tasks list');
      return;
    }
    
    console.log('Refreshed task state:');
    console.log(JSON.stringify(refreshedTask, null, 2));
    
    // Step 5: Verify persistence
    console.log('\nStep 5: Verifying persistence after refresh...');
    
    const idMatchRefreshed = refreshedTask.id === targetTask.id;
    const completionToggledRefreshed = refreshedTask.completed !== targetTask.completed;
    const originPreservedRefreshed = refreshedTask.origin === targetTask.origin;
    const sourceIdPreservedRefreshed = refreshedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatchRefreshed ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${completionToggledRefreshed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${originPreservedRefreshed ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${sourceIdPreservedRefreshed ? '✓' : '✗'}`);
    
    // Display server logs
    console.log('\nServer logs for task update request:');
    const serverLogs = fs.readFileSync('server-logs.txt', 'utf8');
    console.log(serverLogs);
    
    // Get git commit info
    const gitInfo = execSync('git log -1').toString();
    console.log('\nGit commit information:');
    console.log(gitInfo);
    
    // Reset the task to its original state
    console.log('\nResetting task to original state...');
    execSync(
      `curl -s -X PUT "${URL_BASE}/api/projects/${PROJECT_ID}/tasks/${targetTask.id}" \\
      -H "X-Auth-Override: admin" \\
      -H "X-Auth-User-Id: admin" \\
      -H "Content-Type: application/json" \\
      -d '{"completed": ${targetTask.completed}}'`
    );
    console.log('Task reset to original state');
    
    // Report the overall test results
    console.log('\n=== TEST RESULTS ===');
    
    const responseIntegrityOK = idMatch && completionToggled && originPreserved && sourceIdPreserved;
    const persistenceOK = idMatchRefreshed && completionToggledRefreshed && 
                          originPreservedRefreshed && sourceIdPreservedRefreshed;
    
    console.log(`Response Integrity: ${responseIntegrityOK ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Persistence Verification: ${persistenceOK ? 'PASS ✓' : 'FAIL ✗'}`);
    
    const allPassed = responseIntegrityOK && persistenceOK;
    console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    if (allPassed) {
      console.log('\n✓ SUCCESS FACTOR TASK TOGGLE FIX VERIFIED');
      console.log('The server is correctly returning the user task object with updates.');
      console.log('Task completion state is properly persisted.');
    } else {
      console.log('\n✗ SUCCESS FACTOR TASK TOGGLE FIX NOT VERIFIED');
      console.log('There are still issues with the task update response or persistence.');
    }
  } catch (error) {
    console.error('Test failed with unexpected error:', error);
  }
}

// Run the test
testTaskToggle();