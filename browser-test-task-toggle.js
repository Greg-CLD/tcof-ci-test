/**
 * Success Factor Task Toggle Browser Test
 * 
 * This script can be run directly in your browser console while on the checklist page
 * to test if task toggling and persistence works correctly.
 * 
 * Instructions:
 * 1. Open your browser console (F12 or Ctrl+Shift+J)
 * 2. Navigate to your project's checklist page
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run the test
 */

async function testTaskTogglePersistence() {
  try {
    // Step 1: Get all tasks for the current project
    console.log('Step 1: Getting all tasks for the current project...');
    const projectId = window.location.pathname.split('/').filter(Boolean)[1];
    
    if (!projectId) {
      throw new Error('No project ID found in URL - please navigate to a project page');
    }
    
    console.log(`Using project ID: ${projectId}`);
    
    const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`);
    
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
      `/api/projects/${projectId}/tasks/${taskToToggle.id}`,
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
    const verifyResponse = await fetch(`/api/projects/${projectId}/tasks`);
    
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
    
    // Step 5: Test metadata persistence by checking that sourceId and origin are preserved
    console.log('Step 5: Verifying metadata persistence...');
    
    if (
      verifyTask.sourceId === taskToToggle.sourceId &&
      verifyTask.origin === taskToToggle.origin
    ) {
      console.log('✅ SUCCESS: Task metadata was preserved correctly');
    } else {
      console.log('❌ FAILURE: Task metadata was not preserved correctly');
      console.log('Original sourceId:', taskToToggle.sourceId);
      console.log('Updated sourceId:', verifyTask.sourceId);
      console.log('Original origin:', taskToToggle.origin);
      console.log('Updated origin:', verifyTask.origin);
    }
    
    return {
      success: verifyTask.completed === newState && 
               verifyTask.sourceId === taskToToggle.sourceId &&
               verifyTask.origin === taskToToggle.origin,
      task: verifyTask
    };
  } catch (error) {
    console.error('Error during test:', error);
    return { success: false, error: error.message };
  }
}

// Run the test and log the results
testTaskTogglePersistence().then(result => {
  if (result.success) {
    console.log('✨ TEST PASSED: Task persistence is working correctly!');
  } else {
    console.log('❌ TEST FAILED:', result.error || 'Unknown error');
  }
});