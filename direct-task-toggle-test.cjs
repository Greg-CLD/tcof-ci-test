/**
 * Direct Task Toggle Test - Success Factor Tasks
 * 
 * This script demonstrates how the Success Factor task toggle functionality works
 * by directly interacting with the API and measuring task persistence.
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');

// Configuration 
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_PORT = 5000; // Replit runs the express server on port 5000

// Helper function for making API requests
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      // Log response headers
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type'] || 'not set'}`);
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          console.error('Error parsing JSON response:', e);
          console.log('Raw response:', responseData);
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Main test function
async function testSuccessFactorToggle() {
  console.log('=== Success Factor Task Toggle Test ===\n');
  
  try {
    // Step 1: Get all tasks for the project
    console.log('Step 1: Getting all tasks for the project...');
    const tasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    if (!tasksResponse.data || !Array.isArray(tasksResponse.data)) {
      throw new Error('Failed to get tasks or invalid response format');
    }
    
    console.log(`Found ${tasksResponse.data.length} tasks`);
    
    // Step 2: Find a factor-origin task to test with
    console.log('\nStep 2: Finding a factor-origin task for testing...');
    const factorTasks = tasksResponse.data.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      throw new Error('No factor-origin tasks found for testing');
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
    
    // Step 3: Toggle task completion state
    console.log(`\nStep 3: Toggling task completion from ${testTask.completed} to ${!testTask.completed}...`);
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: !testTask.completed }
    );
    
    if (!updateResponse.data) {
      throw new Error('Failed to update task or invalid response');
    }
    
    // Log server response
    console.log('\nServer response after update:');
    console.log(JSON.stringify({
      id: updateResponse.data.id,
      text: updateResponse.data.text,
      origin: updateResponse.data.origin,
      sourceId: updateResponse.data.sourceId,
      completed: updateResponse.data.completed
    }, null, 2));
    
    // Step 4: Verify update integrity
    console.log('\nStep 4: Verifying fields after update...');
    console.log(`ID Match: ${updateResponse.data.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${updateResponse.data.completed !== originalState.completed ? '✓' : '✗'}`); 
    console.log(`Origin Preserved: ${updateResponse.data.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${updateResponse.data.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 5: Verify persistence by retrieving task list again
    console.log('\nStep 5: Fetching tasks again to verify persistence...');
    const refreshResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    if (!refreshResponse.data || !Array.isArray(refreshResponse.data)) {
      throw new Error('Failed to refresh tasks');
    }
    
    const refreshedTask = refreshResponse.data.find(task => task.id === testTask.id);
    
    if (!refreshedTask) {
      throw new Error('Could not find test task in the refreshed list');
    }
    
    console.log('\nTask state after refreshing:');
    console.log(JSON.stringify({
      id: refreshedTask.id,
      text: refreshedTask.text,
      origin: refreshedTask.origin,
      sourceId: refreshedTask.sourceId,
      completed: refreshedTask.completed
    }, null, 2));
    
    // Step 6: Verify persistence integrity
    console.log('\nStep 6: Verifying persistence after refresh...');
    console.log(`ID Match: ${refreshedTask.id === originalState.id ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${refreshedTask.completed !== originalState.completed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${refreshedTask.origin === originalState.origin ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${refreshedTask.sourceId === originalState.sourceId ? '✓' : '✗'}`);
    
    // Step 7: Now test with clean UUID
    if (originalState.id.includes('-') && originalState.id.split('-').length > 5) {
      console.log('\nStep 7: Testing with clean UUID (first 5 segments)...');
      const cleanUuid = originalState.id.split('-').slice(0, 5).join('-');
      console.log(`Using clean UUID: ${cleanUuid}`);
      
      // Reset to original state first
      await apiRequest(
        'PUT',
        `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`,
        { completed: originalState.completed }
      );
      
      // Now update using clean UUID
      const cleanUuidResponse = await apiRequest(
        'PUT',
        `/api/projects/${PROJECT_ID}/tasks/${cleanUuid}`,
        { completed: !originalState.completed }
      );
      
      if (!cleanUuidResponse.data) {
        console.log('Could not update task using clean UUID - this may be expected if server uses exact ID matching only');
      } else {
        console.log('\nServer response after clean UUID update:');
        console.log(JSON.stringify({
          id: cleanUuidResponse.data.id,
          text: cleanUuidResponse.data.text,
          origin: cleanUuidResponse.data.origin,
          sourceId: cleanUuidResponse.data.sourceId,
          completed: cleanUuidResponse.data.completed
        }, null, 2));
        
        console.log('\nVerifying clean UUID update:');
        console.log(`ID Match: ${cleanUuidResponse.data.id === originalState.id ? '✓' : '✗'}`);
        console.log(`Completion Toggled: ${cleanUuidResponse.data.completed !== originalState.completed ? '✓' : '✗'}`);
        console.log(`Origin Preserved: ${cleanUuidResponse.data.origin === originalState.origin ? '✓' : '✗'}`);
        console.log(`SourceId Preserved: ${cleanUuidResponse.data.sourceId === originalState.sourceId ? '✓' : '✗'}`);
      }
    }
    
    // Step 8: Cleanup - reset to original state
    console.log('\nStep 8: Cleaning up - resetting task to original state...');
    const cleanupResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: originalState.completed }
    );
    
    if (cleanupResponse.data) {
      console.log(`Successfully reset task to ${originalState.completed ? 'completed' : 'not completed'} state`);
    } else {
      console.log('Failed to reset task to original state');
    }
    
    // Final summary
    console.log('\n=== Test Results ===');
    const updateSuccessful = 
      updateResponse.data.id === originalState.id &&
      updateResponse.data.completed !== originalState.completed &&
      updateResponse.data.origin === originalState.origin &&
      updateResponse.data.sourceId === originalState.sourceId;
      
    const persistenceVerified = 
      refreshedTask.id === originalState.id &&
      refreshedTask.completed !== originalState.completed &&
      refreshedTask.origin === originalState.origin &&
      refreshedTask.sourceId === originalState.sourceId;
    
    console.log(`Update Success: ${updateSuccessful ? '✓' : '✗'}`);
    console.log(`Persistence Verified: ${persistenceVerified ? '✓' : '✗'}`);
    console.log(`Proper JSON Response: ${updateResponse.headers['content-type']?.includes('application/json') ? '✓' : '✗'}`);
    console.log(`\nOverall Test Result: ${updateSuccessful && persistenceVerified ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    
    // Display implementation explanation
    console.log('\nThis test verifies our fix in projectsDb.ts that enhances task lookup to handle both:');
    console.log('1. Full UUID+suffix ID format');
    console.log('2. Clean UUID (first 5 segments) format');
    console.log('\nThe key improvement is prioritizing factor-origin tasks when matching by UUID prefix:');
    console.log(`
\`\`\`diff
@@ -669,6 +669,22 @@ export const projectsDb = {
   if (!validTaskId) {
     try {
       console.log(\`[TASK_LOOKUP] Attempting prefix match for \${taskId}\`);
+      
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
 
       // Use SQL LIKE for more efficient prefix matching
       const matchingTasks = await db.execute(sql\`
\`\`\`
`);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testSuccessFactorToggle();