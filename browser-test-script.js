/**
 * Simple browser console test for Success Factor task persistence
 * Copy and paste this entire script into your browser console
 */
async function testSuccessFactorTaskToggle() {
  console.log('=== Testing Success Factor Task Toggle Fix ===');
  
  // Step 1: Get existing projects
  console.log('Step 1: Getting existing projects...');
  const projectsResponse = await fetch(`/api/projects`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  
  const projects = await projectsResponse.json();
  console.log(`Found ${projects.length} projects`);
  
  if (!projects.length) {
    console.error('No projects found. Please create a project first.');
    return;
  }
  
  // Use the first project
  const projectId = projects[0].id;
  console.log(`Using project: ${projects[0].name} (${projectId})`);
  
  // Step 2: Get tasks for this project
  console.log('Step 2: Getting tasks for this project...');
  const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  
  const tasks = await tasksResponse.json();
  console.log(`Found ${tasks.length} tasks total`);
  
  // Find a Success Factor task
  const successFactorTasks = tasks.filter(task => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  
  if (!successFactorTasks.length) {
    console.error('No Success Factor tasks found. Make sure your project has Success Factors.');
    return;
  }
  
  // Use the first Success Factor task
  const task = successFactorTasks[0];
  console.log('Selected task for testing:');
  console.log({
    id: task.id,
    text: task.text,
    origin: task.origin,
    sourceId: task.sourceId,
    completed: task.completed
  });
  
  // Step 3: Toggle the task's completion state
  const newCompletedState = !task.completed;
  console.log(`Step 3: Toggling task to completed=${newCompletedState}...`);
  
  const toggleResponse = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      completed: newCompletedState,
      status: newCompletedState ? 'Done' : 'To Do'
    })
  });
  
  console.log(`Toggle response status: ${toggleResponse.status}`);
  
  if (toggleResponse.status === 200) {
    console.log('✅ SUCCESS! Task toggle request returned 200 OK');
    const toggleData = await toggleResponse.json();
    console.log('Response:', toggleData);
  } else {
    console.error('❌ ERROR: Task toggle failed with status', toggleResponse.status);
    try {
      const errorData = await toggleResponse.json();
      console.error('Error details:', errorData);
    } catch (e) {
      console.error('Could not parse error response');
    }
    return;
  }
  
  // Step 4: Verify the task was updated by getting it again
  console.log('Step 4: Verifying task state after toggle...');
  const verifyResponse = await fetch(`/api/projects/${projectId}/tasks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  
  const updatedTasks = await verifyResponse.json();
  const updatedTask = updatedTasks.find(t => t.id === task.id);
  
  if (!updatedTask) {
    console.error('❌ ERROR: Could not find task after toggle!');
    return;
  }
  
  console.log('Updated task state:');
  console.log({
    id: updatedTask.id,
    text: updatedTask.text,
    origin: updatedTask.origin,
    sourceId: updatedTask.sourceId,
    completed: updatedTask.completed
  });
  
  if (updatedTask.completed === newCompletedState) {
    console.log(`✅ SUCCESS: Task state was correctly toggled to completed=${newCompletedState}`);
  } else {
    console.error(`❌ ERROR: Task state was not toggled correctly. Expected ${newCompletedState}, got ${updatedTask.completed}`);
  }
  
  if (updatedTask.origin === task.origin) {
    console.log(`✅ SUCCESS: Task origin "${updatedTask.origin}" was preserved correctly`);
  } else {
    console.error(`❌ ERROR: Task origin changed from "${task.origin}" to "${updatedTask.origin}"`);
  }
  
  console.log('=== Test Complete ===');
  return {
    success: toggleResponse.status === 200 && updatedTask.completed === newCompletedState,
    taskId: task.id,
    originalState: { completed: task.completed, origin: task.origin },
    newState: { completed: updatedTask.completed, origin: updatedTask.origin }
  };
}

// Run the test
testSuccessFactorTaskToggle();