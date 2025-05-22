/**
 * Simple Success Factor Task Toggle Verification Script
 * 
 * This script provides a direct authentication approach for testing
 * the Success Factor task toggle functionality.
 */

const { exec } = require('child_process');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const SF_TASK_ID = 'a5bdff93-3e7d-4e7c-bea5-1ffb0dc7cdaf';

// Execute a command and return the output
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

// Main test function
async function verifySuccessFactorTaskToggle() {
  try {
    console.log('=== Success Factor Task Toggle Fix Verification ===\n');
    
    // Create a test user and get a valid session
    console.log('Step 1: Creating/verifying test user...');
    await executeCommand('curl -s -X POST -H "Content-Type: application/json" http://localhost:5000/api/admin/reset-test-user');
    console.log('Test user confirmed');
    
    // Get all tasks with auth bypass
    console.log('\nStep 2: Getting all tasks for project...');
    const tasksOutput = await executeCommand(`curl -s -X GET -H "Content-Type: application/json" -H "X-Auth-Override: true" http://localhost:5000/api/projects/${PROJECT_ID}/tasks`);
    
    let tasks;
    try {
      tasks = JSON.parse(tasksOutput);
    } catch (error) {
      console.error('Failed to parse tasks JSON response:');
      console.error(tasksOutput);
      return;
    }
    
    if (!Array.isArray(tasks)) {
      console.error('Expected tasks response to be an array, got:', typeof tasks);
      console.error('Response:', tasksOutput);
      return;
    }
    
    console.log(`Found ${tasks.length} tasks in project`);
    
    // Find the Success Factor task
    let targetTask = tasks.find(task => task.id === SF_TASK_ID);
    
    // If the specific task ID isn't found, look for any Success Factor task
    if (!targetTask) {
      console.log(`Task with ID ${SF_TASK_ID} not found, looking for any Success Factor task...`);
      const factorTasks = tasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      if (factorTasks.length === 0) {
        console.error('No Success Factor tasks found in project');
        return;
      }
      
      targetTask = factorTasks[0];
      console.log(`Using alternative Success Factor task: ${targetTask.id}`);
    }
    
    console.log('\nTarget task details:');
    console.log(JSON.stringify({
      id: targetTask.id,
      text: targetTask.text,
      origin: targetTask.origin,
      sourceId: targetTask.sourceId,
      completed: targetTask.completed
    }, null, 2));
    
    // Start capturing server logs
    console.log('\nStarting server log capture...');
    await executeCommand('tail -50 -f .replit/logs/console.log > server-logs.txt & echo $! > logpid.txt');
    await executeCommand('sleep 1'); // Give some time for the log capture to start
    
    // Step 3: Toggle the task completion state
    console.log(`\nStep 3: Toggling task completion from ${targetTask.completed} to ${!targetTask.completed}...`);
    
    const updateCommand = `curl -s -X PUT \\
      -H "Content-Type: application/json" \\
      -H "Accept: application/json" \\
      -H "X-Auth-Override: true" \\
      -d '{"completed": ${!targetTask.completed}}' \\
      http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id}`;
      
    const updateOutput = await executeCommand(updateCommand);
    
    // Wait a moment for logs to be captured
    await executeCommand('sleep 1');
    
    // Stop log capture
    const logPid = fs.readFileSync('logpid.txt', 'utf8').trim();
    await executeCommand(`kill ${logPid}`);
    console.log('Log capture stopped');
    
    console.log('\nPUT API Response:');
    console.log(updateOutput);
    
    let updateResponse;
    try {
      updateResponse = JSON.parse(updateOutput);
    } catch (error) {
      console.error('Failed to parse update response:');
      console.error(updateOutput);
      return;
    }
    
    if (!updateResponse.success || !updateResponse.task) {
      console.error('Update failed or missing task in response');
      return;
    }
    
    const updatedTask = updateResponse.task;
    
    // Step 4: Verify response integrity
    console.log('\nStep 4: Verifying response integrity...');
    
    const idMatch = updatedTask.id === targetTask.id;
    const completionToggled = updatedTask.completed !== targetTask.completed;
    const originPreserved = updatedTask.origin === targetTask.origin;
    const sourceIdPreserved = updatedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatch ? '✓' : '✗'} (${updatedTask.id})`);
    console.log(`Completion Toggled: ${completionToggled ? '✓' : '✗'} (${targetTask.completed} → ${updatedTask.completed})`);
    console.log(`Origin Preserved: ${originPreserved ? '✓' : '✗'} (${updatedTask.origin})`);
    console.log(`SourceId Preserved: ${sourceIdPreserved ? '✓' : '✗'} (${updatedTask.sourceId})`);
    
    // Step 5: Get tasks again to verify persistence
    console.log('\nStep 5: Getting tasks again to verify persistence...');
    
    const refreshOutput = await executeCommand(`curl -s -X GET -H "Content-Type: application/json" -H "X-Auth-Override: true" http://localhost:5000/api/projects/${PROJECT_ID}/tasks`);
    
    let refreshedTasks;
    try {
      refreshedTasks = JSON.parse(refreshOutput);
    } catch (error) {
      console.error('Failed to parse refreshed tasks response');
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
    
    // Step 6: Verify persistence after refresh
    console.log('\nStep 6: Verifying persistence after refresh...');
    
    const idMatchAfterRefresh = refreshedTask.id === targetTask.id;
    const completionToggledAfterRefresh = refreshedTask.completed !== targetTask.completed;
    const originPreservedAfterRefresh = refreshedTask.origin === targetTask.origin;
    const sourceIdPreservedAfterRefresh = refreshedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatchAfterRefresh ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${completionToggledAfterRefresh ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${originPreservedAfterRefresh ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${sourceIdPreservedAfterRefresh ? '✓' : '✗'}`);
    
    // Display server logs
    console.log('\nServer logs during task update:');
    const serverLogs = fs.readFileSync('server-logs.txt', 'utf8');
    console.log(serverLogs);
    
    // Get the latest git commit
    console.log('\nGit commit information:');
    const gitInfo = await executeCommand('git log -1');
    console.log(gitInfo);
    
    // Reset to original state (cleanup)
    console.log('\nResetting task to original state...');
    await executeCommand(`curl -s -X PUT -H "Content-Type: application/json" -H "X-Auth-Override: true" -d '{"completed": ${targetTask.completed}}' http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id}`);
    
    // Overall results
    console.log('\n=== VERIFICATION RESULTS ===');
    
    const responseVerified = idMatch && completionToggled && originPreserved && sourceIdPreserved;
    const persistenceVerified = idMatchAfterRefresh && completionToggledAfterRefresh && 
                               originPreservedAfterRefresh && sourceIdPreservedAfterRefresh;
    
    console.log(`Response Integrity: ${responseVerified ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`Persistence Verification: ${persistenceVerified ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`\nOVERALL RESULT: ${responseVerified && persistenceVerified ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    
    if (responseVerified && persistenceVerified) {
      console.log('\nSUCCESS FACTOR TASK TOGGLE FIX IS WORKING PROPERLY');
      console.log('The server is correctly returning the user task object with the ID matching the request.');
      console.log('Task completion state is properly persisted after refresh.');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
verifySuccessFactorTaskToggle();