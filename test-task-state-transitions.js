/**
 * End-to-end test script for task state transitions
 * This script tests:
 * 1. Finding a project and its tasks
 * 2. Toggling the completion state of a SuccessFactor task
 * 3. Verifying the state is correctly persisted
 */

// Set debug mode to true for detailed logging
const DEBUG = true;

// Console log formatting
function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(`${text}`);
  console.log('='.repeat(80));
}

// Make API requests with proper authentication
async function apiRequest(method, endpoint, body = null) {
  const baseUrl = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  
  const options = {
    method,
    headers,
    credentials: 'include',
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  if (DEBUG) console.log(`Making ${method} request to ${endpoint}`);
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Login to the application
async function login() {
  logHeader('LOGIN');
  try {
    // Just check if we're authenticated
    const userResponse = await apiRequest('GET', '/api/auth/user');
    console.log('Authenticated as:', userResponse.username);
    return true;
  } catch (error) {
    console.error('Login check failed:', error.message);
    console.log('You need to be logged in to run this test.');
    return false;
  }
}

// Get all projects
async function getProjects() {
  logHeader('GETTING PROJECTS');
  const projects = await apiRequest('GET', '/api/projects');
  console.log(`Found ${projects.length} projects`);
  
  if (projects.length === 0) {
    throw new Error('No projects found, cannot continue test');
  }
  
  // Select the first project for testing
  const testProject = projects[0];
  console.log(`Selected project for testing: ${testProject.name} (${testProject.id})`);
  return testProject;
}

// Get tasks for a specific project
async function getTasks(projectId) {
  logHeader(`GETTING TASKS FOR PROJECT ${projectId}`);
  const tasks = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  console.log(`Found ${tasks.length} tasks`);
  
  if (tasks.length === 0) {
    throw new Error('No tasks found for the project, cannot continue test');
  }
  
  // Find a task from the success-factor origin if possible
  const successFactorTask = tasks.find(task => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  if (successFactorTask) {
    console.log(`Found SuccessFactor task: ${successFactorTask.text}`);
    console.log(`Task ID: ${successFactorTask.id}`);
    console.log(`Task Origin: ${successFactorTask.origin}`);
    console.log(`Current completion state: ${successFactorTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    return successFactorTask;
  } else {
    // Fall back to any task if no SuccessFactor task is found
    console.log('No SuccessFactor task found, using regular task for testing');
    const testTask = tasks[0];
    console.log(`Selected task: ${testTask.text}`);
    console.log(`Task ID: ${testTask.id}`);
    console.log(`Task Origin: ${testTask.origin}`);
    console.log(`Current completion state: ${testTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    return testTask;
  }
}

// Toggle a task's completion state
async function toggleTaskCompletion(projectId, task) {
  logHeader(`TOGGLING TASK COMPLETION STATE`);
  console.log(`Task ID: ${task.id}`);
  console.log(`Current state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  console.log(`New state: ${!task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Update the task with opposite completion state
  const updatedTask = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${task.id}`, {
    completed: !task.completed
  });
  
  console.log('Update successful!');
  console.log(`Task state after update: ${updatedTask.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // Verify the task state was updated correctly
  if (updatedTask.completed === !task.completed) {
    console.log('✅ Task state correctly updated');
  } else {
    console.log('❌ Task state was not correctly updated');
  }
  
  return updatedTask;
}

// Verify persistence by fetching the task again
async function verifyPersistence(projectId, taskId, expectedState) {
  logHeader(`VERIFYING PERSISTENCE`);
  console.log(`Fetching tasks again to verify the state was persisted`);
  
  // Fetch all tasks again
  const tasks = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  // Find our task
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    console.log('❌ Task not found when verifying persistence');
    return false;
  }
  
  console.log(`Task found`);
  console.log(`Completion state: ${task.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
  console.log(`Expected state: ${expectedState ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  if (task.completed === expectedState) {
    console.log('✅ SUCCESS: Task state was correctly persisted');
    return true;
  } else {
    console.log('❌ FAILURE: Task state did not persist correctly');
    return false;
  }
}

// Run the complete test
async function runTest() {
  try {
    logHeader('STARTING TASK PERSISTENCE TEST');
    
    // Step 1: Login
    const isLoggedIn = await login();
    if (!isLoggedIn) {
      console.log('Test aborted: Not logged in');
      return { success: false, error: 'Not logged in' };
    }
    
    // Step 2: Get projects
    const project = await getProjects();
    
    // Step 3: Get tasks
    const task = await getTasks(project.id);
    
    // Step 4: Toggle task completion
    const updatedTask = await toggleTaskCompletion(project.id, task);
    
    // Step 5: Verify persistence
    const isPersisted = await verifyPersistence(project.id, task.id, updatedTask.completed);
    
    logHeader('TEST COMPLETED');
    console.log(`Test result: ${isPersisted ? 'SUCCESS' : 'FAILURE'}`);
    
    return {
      success: isPersisted,
      projectId: project.id,
      taskId: task.id,
      taskOrigin: task.origin,
      initialState: task.completed,
      updatedState: updatedTask.completed,
      persistenceVerified: isPersisted
    };
  } catch (error) {
    console.error('Test failed with error:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
runTest().then(result => {
  console.log('Test results:', JSON.stringify(result, null, 2));
});