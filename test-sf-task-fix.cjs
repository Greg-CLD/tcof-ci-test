/**
 * Success Factor Task Update Test (Direct Testing with Auth Bypass)
 * 
 * This script directly tests the PUT /api/projects/:projectId/tasks/:taskId endpoint
 * using the X-Auth-Override header to bypass auth requirements in test mode.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TARGET_TASK_ID = 'a5bdff93-3e7d-4e7c-bea5-1ffb0dc7cdaf';

// Main test function
async function testSuccessFactorTaskToggle() {
  console.log('=== Success Factor Task Toggle Test ===\n');
  
  try {
    // Step 1: Get all tasks for the project
    console.log('Step 1: Getting all tasks for the project...');
    
    const tasksCommand = `curl -s -X GET \\
      -H "X-Auth-Override: true" \\
      -H "Content-Type: application/json" \\
      http://localhost:5000/api/projects/${PROJECT_ID}/tasks`;
    
    const tasksOutput = execSync(tasksCommand).toString();
    const tasks = JSON.parse(tasksOutput);
    
    if (!Array.isArray(tasks)) {
      console.error('Error: Expected tasks to be an array');
      return false;
    }
    
    console.log(`Found ${tasks.length} tasks in the project`);
    
    // Step 2: Find our target Success Factor task
    console.log('\nStep 2: Looking for the target Success Factor task...');
    
    let targetTask = tasks.find(task => task.id === TARGET_TASK_ID);
    
    // If the specific task is not found, look for any Success Factor task
    if (!targetTask) {
      console.log(`Task with ID ${TARGET_TASK_ID} not found, looking for any Success Factor task...`);
      
      const factorTasks = tasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      if (factorTasks.length > 0) {
        targetTask = factorTasks[0];
        console.log(`Using alternative Success Factor task: ${targetTask.id}`);
      } else {
        console.error('No Success Factor tasks found in the project');
        return false;
      }
    }
    
    console.log('Target task found:');
    console.log(JSON.stringify({
      id: targetTask.id,
      text: targetTask.text,
      origin: targetTask.origin,
      sourceId: targetTask.sourceId,
      completed: targetTask.completed
    }, null, 2));
    
    // Step 3: Toggle the task completion state
    console.log(`\nStep 3: Toggling task completion from ${targetTask.completed} to ${!targetTask.completed}...`);
    
    // Start capturing server logs
    const logFile = 'task-update-logs.txt';
    try {
      execSync(`tail -50 -f .replit/logs/console.log > ${logFile} & echo $! > logpid.txt`);
      console.log('Started capturing server logs...');
    } catch (error) {
      console.log('Note: Could not start log capture');
    }
    
    // Execute the PUT request to update the task
    const updateCommand = `curl -s -X PUT \\
      -H "X-Auth-Override: true" \\
      -H "Content-Type: application/json" \\
      -H "Accept: application/json" \\
      -d '{"completed": ${!targetTask.completed}}' \\
      http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id}`;
    
    const updateOutput = execSync(updateCommand).toString();
    
    // Wait a moment for logs to be captured
    execSync('sleep 1');
    
    // Stop log capture
    try {
      const logPid = fs.readFileSync('logpid.txt', 'utf8').trim();
      execSync(`kill ${logPid}`);
      console.log('Stopped log capture');
    } catch (error) {
      console.log('Note: Could not stop log capture');
    }
    
    console.log('\nPUT Response:');
    console.log(updateOutput);
    
    // Parse the response
    let updateResponse;
    try {
      updateResponse = JSON.parse(updateOutput);
    } catch (error) {
      console.error('Error parsing update response JSON:', error);
      console.error('Raw response:', updateOutput);
      return false;
    }
    
    if (!updateResponse.success || !updateResponse.task) {
      console.error('Update failed or missing task object in response');
      return false;
    }
    
    const updatedTask = updateResponse.task;
    
    // Step 4: Verify the response contains the correct user task
    console.log('\nStep 4: Verifying response contains correct user task...');
    
    // Check critical fields
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
    
    const refreshOutput = execSync(tasksCommand).toString();
    const refreshedTasks = JSON.parse(refreshOutput);
    
    if (!Array.isArray(refreshedTasks)) {
      console.error('Error: Expected refreshed tasks to be an array');
      return false;
    }
    
    const refreshedTask = refreshedTasks.find(task => task.id === targetTask.id);
    
    if (!refreshedTask) {
      console.error('Could not find the task in the refreshed task list');
      return false;
    }
    
    console.log('\nRefreshed task state:');
    console.log(JSON.stringify({
      id: refreshedTask.id,
      text: refreshedTask.text,
      origin: refreshedTask.origin,
      sourceId: refreshedTask.sourceId,
      completed: refreshedTask.completed
    }, null, 2));
    
    // Step 6: Verify persistence
    console.log('\nStep 6: Verifying persistence after refresh...');
    
    const idMatchRefreshed = refreshedTask.id === targetTask.id;
    const completionToggledRefreshed = refreshedTask.completed !== targetTask.completed;
    const originPreservedRefreshed = refreshedTask.origin === targetTask.origin;
    const sourceIdPreservedRefreshed = refreshedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatchRefreshed ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${completionToggledRefreshed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${originPreservedRefreshed ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${sourceIdPreservedRefreshed ? '✓' : '✗'}`);
    
    // Display server logs
    console.log('\nServer logs during task update:');
    const logs = fs.readFileSync(logFile, 'utf8');
    console.log(logs);
    
    // Step 7: Reset to original state (cleanup)
    console.log('\nStep 7: Resetting task to original state...');
    
    const resetCommand = `curl -s -X PUT \\
      -H "X-Auth-Override: true" \\
      -H "Content-Type: application/json" \\
      -d '{"completed": ${targetTask.completed}}' \\
      http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${targetTask.id}`;
    
    execSync(resetCommand);
    console.log('Task reset complete');
    
    // Get latest git commit information
    console.log('\nGit commit information:');
    try {
      const gitLog = execSync('git log -1').toString();
      console.log(gitLog);
    } catch (error) {
      console.log('Could not get git information');
    }
    
    // Overall result
    console.log('\n=== TEST RESULTS ===');
    
    const initialUpdateSuccess = idMatch && completionToggled && originPreserved && sourceIdPreserved;
    const persistenceSuccess = idMatchRefreshed && completionToggledRefreshed && 
                              originPreservedRefreshed && sourceIdPreservedRefreshed;
    
    console.log(`Response Integrity: ${initialUpdateSuccess ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Persistence Verification: ${persistenceSuccess ? 'PASS ✓' : 'FAIL ✗'}`);
    
    const allPassed = initialUpdateSuccess && persistenceSuccess;
    console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run the test
testSuccessFactorTaskToggle();