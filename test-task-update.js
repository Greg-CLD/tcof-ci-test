/**
 * Task UUID Lookup Test Script
 * 
 * This script:
 * 1. Creates a test success factor task
 * 2. Extracts the clean UUID (first 5 segments)
 * 3. Attempts to update it using only the clean UUID
 * 4. Verifies the task was properly updated
 */

import fetch from 'node-fetch';

// Utility to clean a task ID (extract just the UUID part)
function cleanTaskId(taskId) {
  if (!taskId) return '';
  return taskId.split('-').slice(0, 5).join('-');
}

// Main test function
async function testTaskUpdate() {
  console.log('===== TASK UUID LOOKUP AND UPDATE TEST =====');
  
  // Configuration
  const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Your test project ID
  const baseUrl = 'http://localhost:5000'; // Your local server URL
  const sampleTaskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-success-factor'; // A sample compound ID
  let cookies = '';
  
  console.log('Configuration:');
  console.log(`- Project ID: ${projectId}`);
  console.log(`- Sample task ID: ${sampleTaskId}`);
  console.log(`- Clean UUID: ${cleanTaskId(sampleTaskId)}`);
  
  try {
    // Step 1: Login first to get a session cookie
    console.log('\nStep 1: Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'password1'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, got session cookie');
    
    // Step 2: Create a test task with a compound ID
    console.log('\nStep 2: Creating test task...');
    const taskData = {
      projectId,
      id: sampleTaskId,
      text: 'Test task for UUID lookup - ' + new Date().toISOString(),
      origin: 'factor',
      source: 'factor',
      completed: false
    };
    
    const createResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(taskData)
    });
    
    if (!createResponse.ok) {
      console.log(`Task creation response: ${createResponse.status} ${createResponse.statusText}`);
      const respText = await createResponse.text();
      console.log(respText);
      throw new Error('Task creation failed');
    }
    
    const createdTask = await createResponse.json();
    console.log(`Task created successfully with ID: ${createdTask.id}`);
    console.log('Created task details:', JSON.stringify(createdTask, null, 2));
    
    // Step 3: Extract the clean UUID
    const cleanUuid = cleanTaskId(createdTask.id);
    console.log(`\nStep 3: Extracted clean UUID: ${cleanUuid}`);
    
    // Step 4: Update the task using only the clean UUID
    console.log('\nStep 4: Updating task using clean UUID...');
    console.log(`PUT request to: ${baseUrl}/api/projects/${projectId}/tasks/${cleanUuid}`);
    
    const updateResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks/${cleanUuid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        completed: true,
        text: 'Updated task with clean UUID - ' + new Date().toISOString()
      })
    });
    
    console.log(`Update response status: ${updateResponse.status} ${updateResponse.statusText}`);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('Error response:', errorText);
      throw new Error('Task update failed');
    }
    
    const updatedTask = await updateResponse.json();
    console.log('Updated task details:', JSON.stringify(updatedTask, null, 2));
    
    // Step 5: Verify the task was updated by fetching all tasks
    console.log('\nStep 5: Verifying task update...');
    const verifyResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Failed to fetch tasks for verification');
    }
    
    const allTasks = await verifyResponse.json();
    const verifiedTask = allTasks.find(t => t.id === createdTask.id);
    
    if (verifiedTask) {
      console.log('Found task after update:');
      console.log('- ID:', verifiedTask.id);
      console.log('- Text:', verifiedTask.text);
      console.log('- Completed:', verifiedTask.completed);
      
      if (verifiedTask.completed === true) {
        console.log('\n✅ SUCCESS: Task was successfully updated using clean UUID!');
      } else {
        console.log('\n❌ FAILURE: Task was found but not properly updated.');
      }
    } else {
      console.log('\n❌ FAILURE: Could not find the task after update.');
    }
    
    // Step 6: Clean up - delete the test task (optional, using clean UUID)
    console.log('\nStep 6: Cleaning up - deleting test task...');
    const deleteResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks/${cleanUuid}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log(`Delete response status: ${deleteResponse.status} ${deleteResponse.statusText}`);
    
    if (deleteResponse.ok) {
      console.log('Test task deleted successfully using clean UUID');
    } else {
      console.log('Warning: Failed to delete test task');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
  
  console.log('\n===== TEST COMPLETED =====');
}

// Run the test
testTaskUpdate();