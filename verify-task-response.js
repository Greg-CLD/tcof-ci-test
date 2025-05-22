/**
 * Success Factor Task Update Response Verification Test
 * 
 * This test verifies that the PUT /api/projects/:projectId/tasks/:taskId
 * endpoint returns the updated user's task object (with user's task ID)
 * and not the source/canonical task object.
 */

import http from 'http';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const PORT = 5000; // Replit server port

// Helper function to make API requests
async function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Override': 'true' // For testing without auth
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          console.error('Error parsing JSON response:', e);
          console.error('Raw response:', responseData);
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

// Test function
async function runTest() {
  console.log('\n=== Success Factor Task Update Response Verification Test ===\n');
  
  try {
    console.log('Step 1: Getting tasks from project...');
    const tasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    if (tasksResponse.statusCode !== 200 || !Array.isArray(tasksResponse.data)) {
      throw new Error(`Failed to get tasks: ${tasksResponse.statusCode}`);
    }
    
    console.log(`Found ${tasksResponse.data.length} tasks in the project`);
    
    // Find Success Factor tasks
    console.log('\nStep 2: Looking for Success Factor tasks...');
    const factorTasks = tasksResponse.data.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      throw new Error('No factor-origin tasks found for testing');
    }
    
    console.log(`Found ${factorTasks.length} factor-origin tasks`);
    
    // Select a task to test with
    const testTask = factorTasks[0];
    console.log('\nSelected test task:');
    console.log(JSON.stringify({
      id: testTask.id,
      text: testTask.text,
      origin: testTask.origin,
      sourceId: testTask.sourceId,
      completed: testTask.completed
    }, null, 2));
    
    // Step 3: Update the task
    console.log(`\nStep 3: Updating task with completed: ${!testTask.completed}...`);
    const updateData = { completed: !testTask.completed };
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      updateData
    );
    
    if (updateResponse.statusCode !== 200) {
      throw new Error(`Failed to update task: ${updateResponse.statusCode}`);
    }
    
    console.log('\nServer response:');
    console.log(JSON.stringify({
      status: updateResponse.statusCode,
      success: updateResponse.data.success,
      message: updateResponse.data.message,
      task: updateResponse.data.task ? {
        id: updateResponse.data.task.id,
        text: updateResponse.data.task.text,
        origin: updateResponse.data.task.origin,
        sourceId: updateResponse.data.task.sourceId,
        completed: updateResponse.data.task.completed
      } : null
    }, null, 2));
    
    // Step 4: Verify the response
    console.log('\nStep 4: Verifying response integrity...');
    
    if (!updateResponse.data.task) {
      throw new Error('Response does not contain task object');
    }
    
    const responseTask = updateResponse.data.task;
    
    // Check that the response task has the same ID as the original task
    const idMatches = responseTask.id === testTask.id;
    console.log(`Task ID matches original: ${idMatches ? '✓' : '✗'}`);
    console.log(`  Original ID: ${testTask.id}`);
    console.log(`  Response ID: ${responseTask.id}`);
    
    // Check that completed value was updated
    const completionUpdated = responseTask.completed === !testTask.completed;
    console.log(`Completion value updated: ${completionUpdated ? '✓' : '✗'}`);
    console.log(`  Original completed: ${testTask.completed}`);
    console.log(`  Response completed: ${responseTask.completed}`);
    
    // Check that metadata was preserved
    const originPreserved = responseTask.origin === testTask.origin;
    console.log(`Origin preserved: ${originPreserved ? '✓' : '✗'}`);
    console.log(`  Original origin: ${testTask.origin}`);
    console.log(`  Response origin: ${responseTask.origin}`);
    
    const sourceIdPreserved = responseTask.sourceId === testTask.sourceId;
    console.log(`SourceId preserved: ${sourceIdPreserved ? '✓' : '✗'}`);
    console.log(`  Original sourceId: ${testTask.sourceId}`);
    console.log(`  Response sourceId: ${responseTask.sourceId}`);
    
    // Step 5: Reset the task to original state
    console.log('\nStep 5: Resetting task to original state...');
    const resetResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`,
      { completed: testTask.completed }
    );
    
    if (resetResponse.statusCode === 200) {
      console.log('Task reset successful');
    } else {
      console.log('Warning: Failed to reset task');
    }
    
    // Print test summary
    console.log('\n=== TEST RESULTS ===');
    const testPassed = idMatches && completionUpdated && originPreserved && sourceIdPreserved;
    console.log(`ID Integrity: ${idMatches ? '✓' : '✗'}`);
    console.log(`Completion Update: ${completionUpdated ? '✓' : '✗'}`);
    console.log(`Metadata Preservation: ${originPreserved && sourceIdPreserved ? '✓' : '✗'}`);
    console.log(`\nOVERALL RESULT: ${testPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    // This is the critical test for the fix:
    if (idMatches) {
      console.log('\n✓ UPDATE FIX VERIFIED: Server is correctly returning the user task, not the source task');
    } else {
      console.log('\n✗ FIX FAILED: Server is still returning the wrong task object');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest();