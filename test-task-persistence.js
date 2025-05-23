/**
 * Success Factor Task Toggle Persistence Test
 * 
 * This script tests if toggling a Success Factor task persists properly
 * by making a direct API request and then verifying the change was saved.
 */

import fetch from 'node-fetch';

async function testTaskPersistence() {
  try {
    // Configuration
    const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Replace with your actual project ID
    const baseUrl = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

    // Get current session cookie from file (if available)
    console.log('Running task persistence test...');
    
    // Step 1: Get all tasks for the project
    console.log('Step 1: Getting all tasks for the project...');
    const tasksResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`);
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to get tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.length} tasks`);
    
    // Step 2: Find a Success Factor task to toggle
    console.log('Step 2: Finding a Success Factor task to toggle...');
    const successFactorTasks = tasks.filter(task => task.origin === 'factor');
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found in the project');
    }
    
    const taskToToggle = successFactorTasks[0];
    console.log(`Selected task: ${taskToToggle.id} - ${taskToToggle.text}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // Step 3: Toggle the task's completion state
    console.log('Step 3: Toggling task completion state...');
    const newState = !taskToToggle.completed;
    
    const updateResponse = await fetch(
      `${baseUrl}/api/projects/${projectId}/tasks/${taskToToggle.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: newState })
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update task: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
    }
    
    const updatedTask = await updateResponse.json();
    console.log(`Task updated. New completion state: ${updatedTask.completed}`);
    
    // Step 4: Verify the change was saved by getting the task again
    console.log('Step 4: Verifying the change was saved...');
    const verifyResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to get tasks for verification: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyTasks = await verifyResponse.json();
    const verifyTask = verifyTasks.find(task => task.id === taskToToggle.id);
    
    if (!verifyTask) {
      throw new Error(`Could not find the task after update`);
    }
    
    console.log(`Verified task state: ${verifyTask.completed}`);
    
    if (verifyTask.completed === newState) {
      console.log('✅ SUCCESS: Task persistence is working correctly');
    } else {
      console.log('❌ FAILURE: Task state did not persist');
    }
    
    return { success: verifyTask.completed === newState, task: verifyTask };
  } catch (error) {
    console.error('Error during test:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testTaskPersistence().then(result => {
  if (result.success) {
    console.log('Test completed successfully');
  } else {
    console.log('Test failed:', result.error);
  }
});