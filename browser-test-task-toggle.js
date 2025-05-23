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
  console.log('=== Success Factor Task Toggle Persistence Test ===');
  
  try {
    // Step 1: Get the current project ID from the URL
    const projectId = window.location.pathname.split('/').find(segment => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    );
    
    if (!projectId) {
      console.error('❌ No project ID found in the URL. Please navigate to a project page first.');
      return;
    }
    
    console.log(`✅ Found project ID: ${projectId}`);
    
    // Step 2: Get all tasks for the current project
    console.log('\nStep 2: Getting tasks for the current project...');
    const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`);
    
    if (!tasksResponse.ok) {
      console.error(`❌ Failed to get tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
      return;
    }
    
    const tasks = await tasksResponse.json();
    
    if (!tasks || !tasks.length) {
      console.error('❌ No tasks found for this project');
      return;
    }
    
    // Filter for Success Factor tasks only
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (!successFactorTasks.length) {
      console.error('❌ No Success Factor tasks found for this project');
      return;
    }
    
    console.log(`✅ Found ${successFactorTasks.length} Success Factor tasks`);
    
    // Select the first uncompleted task for testing
    let taskToToggle = successFactorTasks.find(task => !task.completed);
    
    // If all tasks are completed, use the first task
    if (!taskToToggle) {
      taskToToggle = successFactorTasks[0];
    }
    
    console.log(`\nSelected task for testing:`);
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text.substring(0, 50)}...`);
    console.log(`Completed: ${taskToToggle.completed}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId}`);
    
    // Save original state for comparison
    const originalState = taskToToggle.completed;
    const newState = !originalState;
    
    // Step 3: Toggle the task's completion state
    console.log(`\nStep 3: Toggling task completion from ${originalState} to ${newState}...`);
    
    const toggleResponse = await fetch(`/api/projects/${projectId}/tasks/${taskToToggle.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        completed: newState
      })
    });
    
    if (!toggleResponse.ok) {
      console.error(`❌ Failed to toggle task: ${toggleResponse.status} ${toggleResponse.statusText}`);
      const errorText = await toggleResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const updatedTask = await toggleResponse.json();
    
    console.log('Toggle response:');
    console.log(`Status: ${toggleResponse.status} ${toggleResponse.statusText}`);
    console.log(`Completed: ${updatedTask.completed}`);
    
    if (updatedTask.completed !== newState) {
      console.error(`❌ Task completion state was not updated in the response (expected ${newState}, got ${updatedTask.completed})`);
      return;
    }
    
    console.log(`✅ Task completion toggled successfully in API response`);
    
    // Step 4: Get tasks again to verify the change persisted
    console.log('\nStep 4: Getting tasks again to verify persistence...');
    const verifyResponse = await fetch(`/api/projects/${projectId}/tasks`);
    
    if (!verifyResponse.ok) {
      console.error(`❌ Failed to get tasks for verification: ${verifyResponse.status} ${verifyResponse.statusText}`);
      return;
    }
    
    const verifyTasks = await verifyResponse.json();
    const verifiedTask = verifyTasks.find(task => task.id === taskToToggle.id);
    
    if (!verifiedTask) {
      console.error('❌ Task not found in API response after toggle');
      return;
    }
    
    console.log('Task from API after toggle:');
    console.log(`ID: ${verifiedTask.id}`);
    console.log(`Completed: ${verifiedTask.completed}`);
    
    if (verifiedTask.completed !== newState) {
      console.error(`❌ Task completion state was not persisted (expected ${newState}, got ${verifiedTask.completed})`);
      return;
    }
    
    console.log(`✅ Task completion state was correctly persisted and returned via API`);
    
    // Step 5: Reload the page to verify persistence across page reloads
    console.log('\nStep 5: To complete the test, please reload the page manually and check if:');
    console.log(`1. The task "${taskToToggle.text.substring(0, 30)}..." is still ${newState ? 'completed' : 'not completed'}`);
    console.log('2. The checkbox state matches the expected state');
    console.log('\n✅ Test completed successfully! You should reload the page to verify persistence.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testTaskTogglePersistence();