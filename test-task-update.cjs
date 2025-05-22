/**
 * Success Factor Task Toggle Test
 * 
 * This script directly tests the server's ability to update Success Factor task completion states
 * and properly maintain metadata (origin, sourceId) through the update process.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Project ID to use for the test
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Execute curl commands to test the API
function runApiCommand(command) {
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
async function testSuccessFactorToggle() {
  console.log('=== Testing Success Factor Task Toggle Persistence ===\n');
  
  // Step 1: Get all tasks for the project
  console.log('STEP 1: Getting all tasks from the project...');
  const allTasks = runApiCommand(`curl -s http://localhost:3000/api/projects/${PROJECT_ID}/tasks`);
  
  if (!allTasks || !Array.isArray(allTasks)) {
    console.error('Failed to fetch tasks or response is not an array');
    return;
  }
  
  console.log(`Found ${allTasks.length} tasks in the project\n`);
  
  // Step 2: Find a factor-origin task to test with
  console.log('STEP 2: Finding a factor-origin task for testing...');
  const factorTasks = allTasks.filter(task => 
    (task.origin === 'factor' || task.origin === 'success-factor')
  );
  
  if (factorTasks.length === 0) {
    console.error('No factor-origin tasks found for testing');
    return;
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
  
  // Save original state for comparison
  const originalState = {
    id: testTask.id,
    text: testTask.text,
    origin: testTask.origin,
    sourceId: testTask.sourceId,
    completed: testTask.completed
  };
  
  // Step 3: Toggle the task completion state
  console.log(`\nSTEP 3: Toggling task completion state from ${testTask.completed} to ${!testTask.completed}...`);
  
  // Capture server logs to observe the task lookup process
  console.log('\nCapturing server logs during update...');
  const logFile = 'task-update-logs.txt';
  try {
    // Start a background process to capture logs during the update
    execSync(`tail -50 -f .replit/logs/console.log > ${logFile} & sleep 1`);
  } catch (err) {
    console.log('Note: Log capture may not be working');
  }
  
  // Make the update request with curl
  const updatedTask = runApiCommand(`curl -s -X PUT \\
    -H "Content-Type: application/json" \\
    -d '{"completed": ${!testTask.completed}}' \\
    http://localhost:3000/api/projects/${PROJECT_ID}/tasks/${testTask.id}`);
  
  if (!updatedTask) {
    console.error('Failed to update task');
    return;
  }
  
  console.log('\nServer response after update:');
  console.log(JSON.stringify({
    id: updatedTask.id,
    text: updatedTask.text,
    origin: updatedTask.origin,
    sourceId: updatedTask.sourceId,
    completed: updatedTask.completed
  }, null, 2));
  
  // Step 4: Verify the update was successful and maintained metadata
  console.log('\nSTEP 4: Verifying fields after update...');
  console.log(`ID Match: ${updatedTask.id === originalState.id ? '✓' : '✗'}`);
  console.log(`Completion Toggled: ${updatedTask.completed !== originalState.completed ? '✓' : '✗'}`);
  console.log(`Origin Preserved: ${updatedTask.origin === originalState.origin ? '✓' : '✗'}`);
  console.log(`SourceId Preserved: ${updatedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
  
  // Step 5: Retrieve the task list again to verify persistence
  console.log('\nSTEP 5: Getting tasks again to verify persistence...');
  const refreshedTasks = runApiCommand(`curl -s http://localhost:3000/api/projects/${PROJECT_ID}/tasks`);
  
  if (!refreshedTasks || !Array.isArray(refreshedTasks)) {
    console.error('Failed to fetch refreshed tasks');
    return;
  }
  
  const refreshedTask = refreshedTasks.find(task => task.id === testTask.id);
  
  if (!refreshedTask) {
    console.error('Could not find the task in the refreshed task list');
    return;
  }
  
  console.log('\nTask state after refresh:');
  console.log(JSON.stringify({
    id: refreshedTask.id,
    text: refreshedTask.text,
    origin: refreshedTask.origin,
    sourceId: refreshedTask.sourceId,
    completed: refreshedTask.completed
  }, null, 2));
  
  // Step 6: Verify persistence
  console.log('\nSTEP 6: Verifying persistence after refresh...');
  console.log(`ID Match: ${refreshedTask.id === originalState.id ? '✓' : '✗'}`);
  console.log(`Completion Toggled: ${refreshedTask.completed !== originalState.completed ? '✓' : '✗'}`);
  console.log(`Origin Preserved: ${refreshedTask.origin === originalState.origin ? '✓' : '✗'}`);
  console.log(`SourceId Preserved: ${refreshedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
  
  // Display server logs that were captured during the update
  try {
    console.log('\nServer logs during task update:');
    const logs = fs.readFileSync(logFile, 'utf8');
    console.log(logs);
  } catch (err) {
    console.log('Note: Could not read server logs');
  }
  
  // Step 7: Toggle back to original state for cleanup
  console.log('\nSTEP 7: Cleaning up - toggling task back to original state...');
  const cleanupTask = runApiCommand(`curl -s -X PUT \\
    -H "Content-Type: application/json" \\
    -d '{"completed": ${originalState.completed}}' \\
    http://localhost:3000/api/projects/${PROJECT_ID}/tasks/${testTask.id}`);
  
  if (cleanupTask) {
    console.log(`Successfully reset task to original state: ${originalState.completed ? 'completed' : 'not completed'}`);
  } else {
    console.warn('Warning: Failed to reset task to original state');
  }
  
  // Test summary and code diff
  console.log('\n=== Success Factor Task Toggle Test Results ===');
  
  const testPassed = 
    updatedTask.id === originalState.id &&
    updatedTask.completed !== originalState.completed &&
    updatedTask.origin === originalState.origin &&
    updatedTask.sourceId === originalState.sourceId &&
    refreshedTask.id === originalState.id &&
    refreshedTask.completed !== originalState.completed &&
    refreshedTask.origin === originalState.origin &&
    refreshedTask.sourceId === originalState.sourceId;
  
  console.log(`\nTest result: ${testPassed ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
  
  // Show the code implementation that ensures task lookup works with both UUID formats
  console.log('\nKey improvement in projectsDb.ts that enables this functionality:');
  console.log(`
\`\`\`diff
@@ -600,15 +609,25 @@ export const projectsDb = {
   // STEP 3: Try prefix matching as a last resort
   if (!validTaskId) {
     try {
       console.log(\`[TASK_LOOKUP] Attempting prefix match for \${taskId}\`);
       
+      // ENHANCED: Special handling for Success Factor tasks
+      // First try to find any factor-origin tasks with this UUID part
+      const factorTasksQuery = await db.execute(sql\`
+        SELECT * FROM project_tasks 
+        WHERE (id LIKE \${idToCheck + '%'} OR source_id LIKE \${idToCheck + '%'})
+        AND (origin = 'factor' OR origin = 'success-factor')
+        LIMIT 1
+      \`);
+      
+      if (factorTasksQuery.rows && factorTasksQuery.rows.length > 0) {
+        validTaskId = factorTasksQuery.rows[0].id;
+        lookupMethod = 'factorMatch';
+        console.log(\`[TASK_LOOKUP] Found factor/success-factor task with ID/sourceId prefix \${idToCheck}, full ID: \${validTaskId}\`);
+        break; // Success - exit the loop
+      }
+      
       // Use SQL LIKE for more efficient prefix matching
       const matchingTasks = await db.execute(sql\`
         SELECT * FROM project_tasks 
         WHERE id LIKE \${idToCheck + '%'} 
         OR source_id LIKE \${idToCheck + '%'}
         LIMIT 1
       \`);
\`\`\`
`);

  // Display matching unit test
  console.log('\nMatching unit test for this functionality:');
  console.log(`
\`\`\`js
// test/success-factor-persistence.spec.ts
it('should persist success factor task completion and retain metadata', async () => {
  // Setup: Create a factor-origin task
  const factorTask = await db.insert(projectTasksTable).values({
    id: uuidv4(),
    projectId: testProjectId,
    text: 'Test Factor Task',
    origin: 'factor',
    sourceId: uuidv4() + '-suffix123', // Compound ID with suffix
    completed: false,
    stage: 'identification',
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();
  
  // Test 1: Verify we can find and update the task using full ID
  const fullIdUpdate = await projectsDb.updateTask(factorTask[0].id, {
    completed: true
  });
  expect(fullIdUpdate.id).toBe(factorTask[0].id);
  expect(fullIdUpdate.completed).toBe(true);
  expect(fullIdUpdate.origin).toBe('factor');
  expect(fullIdUpdate.sourceId).toBe(factorTask[0].sourceId);
  
  // Test 2: Verify we can find and update the task using clean UUID part
  const cleanUuid = factorTask[0].sourceId.split('-').slice(0, 5).join('-');
  const cleanUuidUpdate = await projectsDb.updateTask(cleanUuid, {
    completed: false
  });
  expect(cleanUuidUpdate.id).toBe(factorTask[0].id);
  expect(cleanUuidUpdate.completed).toBe(false);
  expect(cleanUuidUpdate.origin).toBe('factor');
  expect(cleanUuidUpdate.sourceId).toBe(factorTask[0].sourceId);
});
\`\`\`
`);
}

// Run the test
testSuccessFactorToggle();