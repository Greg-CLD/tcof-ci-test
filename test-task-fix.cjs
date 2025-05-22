/**
 * Success Factor Task Response Fix Verification
 * 
 * This test script verifies that our fix to the PUT task endpoint correctly 
 * returns the user's task object with the expected ID.
 */

const { execSync } = require('child_process');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Helper to run curl commands with JSON parsing
function runApiCall(command) {
  try {
    const output = execSync(command).toString();
    return JSON.parse(output);
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.toString());
    return null;
  }
}

// Main test function
async function testTaskResponseFix() {
  console.log('=== Success Factor Task Response Fix Verification ===\n');
  
  try {
    // Step 1: Get tasks for the project
    console.log('Step 1: Getting tasks for project...');
    const tasksCommand = `curl -s -X GET "http://localhost:5000/api/projects/${PROJECT_ID}/tasks" -H "Content-Type: application/json" -H "X-Auth-Override: true"`;
    const tasks = runApiCall(tasksCommand);
    
    if (!tasks || !Array.isArray(tasks)) {
      throw new Error('Failed to get tasks or response is not an array');
    }
    
    console.log(`Found ${tasks.length} tasks in the project`);
    
    // Step 2: Find a Success Factor task for testing
    console.log('\nStep 2: Finding a Success Factor task...');
    const factorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      throw new Error('No Success Factor tasks found for testing');
    }
    
    const testTask = factorTasks[0];
    console.log('\nSelected test task:');
    console.log(JSON.stringify({
      id: testTask.id,
      text: testTask.text,
      origin: testTask.origin,
      sourceId: testTask.sourceId,
      completed: testTask.completed
    }, null, 2));
    
    // Step 3: Toggle task completion
    console.log(`\nStep 3: Toggling task completion from ${testTask.completed} to ${!testTask.completed}...`);
    const updateCommand = `curl -s -X PUT "http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${testTask.id}" -H "Content-Type: application/json" -H "X-Auth-Override: true" -d '{"completed": ${!testTask.completed}}'`;
    const updateResponse = runApiCall(updateCommand);
    
    if (!updateResponse || !updateResponse.success) {
      throw new Error('Failed to update task');
    }
    
    console.log('\nServer response:');
    console.log(JSON.stringify({
      success: updateResponse.success,
      message: updateResponse.message,
      task: {
        id: updateResponse.task.id,
        text: updateResponse.task.text,
        origin: updateResponse.task.origin,
        sourceId: updateResponse.task.sourceId,
        completed: updateResponse.task.completed
      }
    }, null, 2));
    
    // Step 4: Verify that the response task has the expected ID
    console.log('\nStep 4: Verifying response integrity...');
    
    // Critical test - check that returned task has same ID as the requested one
    const idMatch = updateResponse.task.id === testTask.id;
    console.log(`Task ID matches original: ${idMatch ? '✓' : '✗'}`);
    console.log(`  Original ID: ${testTask.id}`);
    console.log(`  Response ID: ${updateResponse.task.id}`);
    
    // Verify completion was updated
    const completionUpdated = updateResponse.task.completed === !testTask.completed;
    console.log(`Completion toggled: ${completionUpdated ? '✓' : '✗'}`);
    
    // Verify metadata was preserved
    const originPreserved = updateResponse.task.origin === testTask.origin;
    console.log(`Origin preserved: ${originPreserved ? '✓' : '✗'}`);
    
    const sourceIdPreserved = updateResponse.task.sourceId === testTask.sourceId;
    console.log(`SourceId preserved: ${sourceIdPreserved ? '✓' : '✗'}`);
    
    // Step 5: Reset task to original state (cleanup)
    console.log('\nStep 5: Resetting task to original state...');
    const resetCommand = `curl -s -X PUT "http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${testTask.id}" -H "Content-Type: application/json" -H "X-Auth-Override: true" -d '{"completed": ${testTask.completed}}'`;
    const resetResponse = runApiCall(resetCommand);
    
    if (resetResponse && resetResponse.success) {
      console.log('Task reset successful');
    } else {
      console.log('Warning: Failed to reset task');
    }
    
    // Summary
    console.log('\n=== TEST RESULTS ===');
    console.log(`ID Integrity: ${idMatch ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Task Update: ${completionUpdated ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Metadata Preservation: ${(originPreserved && sourceIdPreserved) ? 'PASS ✓' : 'FAIL ✗'}`);
    
    const allPassed = idMatch && completionUpdated && originPreserved && sourceIdPreserved;
    console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    // Check if this confirms our fix
    if (idMatch) {
      console.log('\n✓ FIX CONFIRMED: Server is correctly returning the user task object, not the source task');
    } else {
      console.log('\n✗ FIX NOT CONFIRMED: Server might still be returning the wrong task object');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testTaskResponseFix();