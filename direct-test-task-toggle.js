/**
 * Direct Test for Success Factor Task Toggle
 * 
 * This is a minimal script that directly tests the task toggle functionality
 * using direct curl commands with authentication bypass.
 */

const { spawnSync } = require('child_process');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TASK_ID = 'a5bdff93-3e7d-4e7c-bea5-1ffb0dc7cdaf';

// Helper function to run curl commands
function runCurl(command) {
  const result = spawnSync('bash', ['-c', command], { encoding: 'utf8' });
  if (result.error) {
    console.error('Error executing command:', result.error);
    return null;
  }
  if (result.stderr) {
    console.error('Command stderr:', result.stderr);
  }
  return result.stdout;
}

// Log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Main test function
async function testTaskToggle() {
  log('=== Direct Success Factor Task Toggle Test ===');
  
  // Step 1: Find a Success Factor task to test with
  log('\nStep 1: Finding a test task...');
  const getTasksCmd = `curl -s -X GET "http://localhost:5000/api/projects/${PROJECT_ID}/tasks" -H "X-Auth-Override: true"`;
  const tasksOutput = runCurl(getTasksCmd);
  
  if (!tasksOutput) {
    log('Error: Failed to get tasks');
    return;
  }
  
  let tasks;
  try {
    tasks = JSON.parse(tasksOutput);
  } catch (error) {
    log('Error parsing tasks response:');
    log(tasksOutput);
    return;
  }
  
  if (!Array.isArray(tasks)) {
    log('Error: Expected tasks response to be an array');
    log('Response was:');
    log(tasksOutput);
    return;
  }
  
  log(`Found ${tasks.length} tasks in the project`);
  
  // Try to find our specific target task
  let targetTask = tasks.find(task => task.id === TASK_ID);
  
  // If the specific task isn't found, look for any Success Factor task
  if (!targetTask) {
    log(`Task with ID ${TASK_ID} not found, looking for any Success Factor task...`);
    const factorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      log('No Success Factor tasks found in the project');
      return;
    }
    
    targetTask = factorTasks[0];
    log(`Using alternative Success Factor task: ${targetTask.id}`);
  }
  
  log('Target task:');
  log(JSON.stringify(targetTask, null, 2));
  
  // Store original state for comparison
  const originalState = {
    id: targetTask.id,
    text: targetTask.text,
    origin: targetTask.origin,
    sourceId: targetTask.sourceId,
    completed: targetTask.completed
  };
  
  // Step 2: Toggle the task completion state
  log(`\nStep 2: Toggling task completion from ${targetTask.completed} to ${!targetTask.completed}...`);
  
  // Start server log capture
  log('Starting server log capture...');
  runCurl('tail -50 -f .replit/logs/console.log > server-logs.txt & echo $! > log-pid.txt');
  
  // Add a slight delay for the log capture to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const updateCmd = `curl -v -X PUT "http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id}" \\
  -H "X-Auth-Override: true" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{"completed": ${!targetTask.completed}}'`;
  
  log('\nExecuting PUT request:');
  log(updateCmd);
  
  const updateOutput = runCurl(updateCmd);
  
  // Add delay for logs to be captured
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Stop log capture
  const logPid = runCurl('cat log-pid.txt').trim();
  if (logPid) {
    runCurl(`kill ${logPid}`);
    log('Stopped log capture');
  }
  
  log('\nPUT Response:');
  log(updateOutput);
  
  let updateResponse;
  try {
    updateResponse = JSON.parse(updateOutput);
  } catch (error) {
    log('Error parsing update response:');
    log(updateOutput);
    return;
  }
  
  if (!updateResponse.success || !updateResponse.task) {
    log('Update failed or missing task object in response');
    return;
  }
  
  const updatedTask = updateResponse.task;
  
  // Step 3: Verify the response
  log('\nStep 3: Verifying response integrity...');
  
  // Check critical fields
  const idMatch = updatedTask.id === targetTask.id;
  const completionToggled = updatedTask.completed !== targetTask.completed;
  const originPreserved = updatedTask.origin === targetTask.origin;
  const sourceIdPreserved = updatedTask.sourceId === targetTask.sourceId;
  
  log(`ID Match: ${idMatch ? '✓' : '✗'}`);
  log(`Completion Toggled: ${completionToggled ? '✓' : '✗'}`);
  log(`Origin Preserved: ${originPreserved ? '✓' : '✗'}`);
  log(`SourceId Preserved: ${sourceIdPreserved ? '✓' : '✗'}`);
  
  // Step 4: Get tasks again to verify persistence
  log('\nStep 4: Getting tasks again to verify persistence...');
  const refreshOutput = runCurl(getTasksCmd);
  
  let refreshedTasks;
  try {
    refreshedTasks = JSON.parse(refreshOutput);
  } catch (error) {
    log('Error parsing refreshed tasks response');
    return;
  }
  
  const refreshedTask = refreshedTasks.find(task => task.id === targetTask.id);
  
  if (!refreshedTask) {
    log('Could not find the task in the refreshed task list');
    return;
  }
  
  log('\nRefreshed task state:');
  log(JSON.stringify(refreshedTask, null, 2));
  
  // Step 5: Verify persistence
  log('\nStep 5: Verifying persistence after refresh...');
  
  const idMatchRefreshed = refreshedTask.id === targetTask.id;
  const completionToggledRefreshed = refreshedTask.completed !== targetTask.completed;
  const originPreservedRefreshed = refreshedTask.origin === targetTask.origin;
  const sourceIdPreservedRefreshed = refreshedTask.sourceId === targetTask.sourceId;
  
  log(`ID Match: ${idMatchRefreshed ? '✓' : '✗'}`);
  log(`Completion Toggled: ${completionToggledRefreshed ? '✓' : '✗'}`);
  log(`Origin Preserved: ${originPreservedRefreshed ? '✓' : '✗'}`);
  log(`SourceId Preserved: ${sourceIdPreservedRefreshed ? '✓' : '✗'}`);
  
  // Display server logs
  log('\nServer logs during task update:');
  const serverLogs = runCurl('cat server-logs.txt');
  log(serverLogs);
  
  // Step 6: Reset to original state
  log('\nStep 6: Resetting task to original state...');
  const resetCmd = `curl -s -X PUT "http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id}" \\
  -H "X-Auth-Override: true" \\
  -H "Content-Type: application/json" \\
  -d '{"completed": ${targetTask.completed}}'`;
  
  runCurl(resetCmd);
  log('Task reset complete');
  
  // Get git commit info
  log('\nGit commit information:');
  const gitInfo = runCurl('git log -1');
  log(gitInfo);
  
  // Final result
  const responseValid = idMatch && completionToggled && originPreserved && sourceIdPreserved;
  const persistenceValid = idMatchRefreshed && completionToggledRefreshed && 
                          originPreservedRefreshed && sourceIdPreservedRefreshed;
  
  log('\n=== TEST RESULTS ===');
  log(`Response Integrity: ${responseValid ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`Persistence Verified: ${persistenceValid ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`\nOVERALL RESULT: ${responseValid && persistenceValid ? 'PASS ✓' : 'FAIL ✗'}`);
}

// Run the test
testTaskToggle();