/**
 * Browser-Compatible Success Factor Task Toggle Test
 * 
 * Copy and paste this script into your browser console while logged in to test
 * whether task state changes persist across pageloads.
 */

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

(async function runTest() {
  console.log('=== Success Factor Task Toggle Persistence Test ===');

  try {
    // STEP 1: Get all tasks for the current project
    console.log('\n--- STEP 1: Getting all tasks for the current project ---');
    const initialTasks = await fetchWithAuth(`/api/projects/${PROJECT_ID}/tasks`);
    console.log(`Found ${initialTasks.length} tasks`);

    // Find Success Factor tasks
    const successFactorTasks = initialTasks.filter(task => task.origin === 'factor');
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);

    if (successFactorTasks.length === 0) {
      console.log('No Success Factor tasks found to test with. Test cannot continue.');
      return;
    }

    // STEP 2: Select a task to toggle and log its details
    const taskToToggle = successFactorTasks[0];
    console.log('\n--- STEP 2: Selected task to toggle ---');
    console.log('Task ID:', taskToToggle.id);
    console.log('Source ID:', taskToToggle.sourceId);
    console.log('Text:', taskToToggle.text);
    console.log('Current completion state:', taskToToggle.completed);

    // STEP 3: Toggle the task
    console.log('\n--- STEP 3: Toggling task completion state ---');
    const newState = !taskToToggle.completed;
    
    console.log(`Changing completed from ${taskToToggle.completed} to ${newState}`);
    
    try {
      const updateResponse = await fetchWithAuth(
        `/api/projects/${PROJECT_ID}/tasks/${taskToToggle.id}`,
        'PUT',
        { completed: newState }
      );
      
      console.log('Update response:', updateResponse);
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }

    // STEP 4: Verify the task state was updated
    console.log('\n--- STEP 4: Verifying task state after toggle ---');
    const updatedTasks = await fetchWithAuth(`/api/projects/${PROJECT_ID}/tasks`);
    
    const updatedTask = updatedTasks.find(t => t.id === taskToToggle.id);
    
    if (!updatedTask) {
      console.error('Task not found after update!');
      console.log('All task IDs:', updatedTasks.map(t => t.id));
      throw new Error('Task disappeared after update');
    }
    
    console.log('Updated task state:', updatedTask.completed);
    console.log('Toggle successful?', updatedTask.completed === newState);
    
    if (updatedTask.completed !== newState) {
      console.error('Task state was not updated correctly!');
      console.log('Expected:', newState);
      console.log('Actual:', updatedTask.completed);
      throw new Error('Task state did not change as expected');
    }

    // STEP 5: Force page reload to test persistence
    console.log('\n--- STEP 5: Testing persistence across page reload ---');
    console.log('Task state before reload:', updatedTask.completed);
    console.log('Please reload the page manually, then run the verification script');
    console.log('Copy this code to verify after reload:');
    console.log(`
    (async function verifyAfterReload() {
      const tasks = await fetch('/api/projects/${PROJECT_ID}/tasks', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }).then(r => r.json());
      
      const task = tasks.find(t => t.id === '${taskToToggle.id}');
      
      console.log('Task found after reload:', !!task);
      console.log('Task completion state after reload:', task?.completed);
      console.log('Expected state:', ${newState});
      console.log('Persistence successful?', task?.completed === ${newState});
    })();
    `);

    console.log('\nTest successful! Task toggled to:', newState);
  } catch (error) {
    console.error('Test failed with error:', error);
  }
})();

// Helper function for authenticated API requests
async function fetchWithAuth(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include'
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const text = await response.text();
    console.error(`API Error (${response.status}):`, text);
    throw new Error(`API request failed: ${response.status} ${text}`);
  }

  return response.json();
}