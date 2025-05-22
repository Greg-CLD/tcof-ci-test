/**
 * Checklist Task Persistence Test
 * 
 * This script verifies that Success Factor tasks properly persist their toggle state.
 * It follows these steps:
 * 1. Get all tasks for a project
 * 2. Find a Success Factor task
 * 3. Toggle its completion state
 * 4. Re-fetch the tasks to verify the state persisted
 */

// Main test function
(async () => {
  // Use the test project ID
  const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  
  console.log('=== CHECKLIST PERSISTENCE TEST ===');
  console.log('Step 1: Fetching initial tasks...');
  
  // 1. Fetch initial tasks
  const initialTasks = await fetch(`/api/projects/${projectId}/tasks`, { 
    credentials: 'include' 
  }).then(r => r.json());
  
  console.log(`Found ${initialTasks.length} tasks`);
  
  // 2. Find a Success Factor task to toggle
  const factorTask = initialTasks.find(x => x.origin === 'factor');
  
  if (!factorTask) {
    console.error('ERROR: No Success Factor task found to test!');
    return;
  }
  
  console.log('Step 2: Found Success Factor task to toggle:');
  console.log({
    id: factorTask.id,
    text: factorTask.text,
    currentState: factorTask.completed,
    origin: factorTask.origin,
    sourceId: factorTask.sourceId
  });
  
  // 3. Toggle the task's completion state
  console.log(`Step 3: Toggling task to ${!factorTask.completed}...`);
  
  const toggleResponse = await fetch(`/api/projects/${projectId}/tasks/${factorTask.id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !factorTask.completed })
  });
  
  const toggleResult = await toggleResponse.json();
  console.log('Toggle response:', toggleResult);
  
  // 4. Re-fetch tasks to verify persistence
  console.log('Step 4: Re-fetching tasks to verify persistence...');
  
  const updatedTasks = await fetch(`/api/projects/${projectId}/tasks`, { 
    credentials: 'include' 
  }).then(r => r.json());
  
  // 5. Find the same task in the updated list
  const updatedTask = updatedTasks.find(x => x.id === factorTask.id);
  
  if (!updatedTask) {
    console.error('ERROR: Task disappeared after toggle!');
    return;
  }
  
  // 6. Verify the task state was actually updated
  const stateChanged = updatedTask.completed !== factorTask.completed;
  
  console.log('Verification results:');
  console.log({
    originalState: factorTask.completed,
    newState: updatedTask.completed,
    stateChanged,
    successfullyPersisted: stateChanged
  });
  
  // 7. Final result
  if (stateChanged) {
    console.log('✅ CHECKLIST PERSISTENCE FIXED ✅');
    console.log('Task toggle state successfully persisted!');
  } else {
    console.error('❌ PERSISTENCE TEST FAILED ❌');
    console.error('Task toggle did not persist! UI will still show incorrect state.');
  }
  
  console.log('\nTest complete!');
})();