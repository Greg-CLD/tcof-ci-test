/**
 * Direct Test for Task Toggle Persistence
 * 
 * This script directly tests the PUT /api/projects/:projectId/tasks/:taskId endpoint
 * to verify our implementation of getTaskById is fixing the 500 errors.
 * 
 * This script can be run in the browser console to test with the authenticated session.
 */

// Configuration
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

// Toggle timeout (ms)
const TOGGLE_DELAY = 1000;

// API request helper with logging
async function apiRequest(method, endpoint, body = null) {
  console.log(`${BLUE}[API] ${method} ${endpoint}${RESET}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log(`Request body:`, body);
  }
  
  try {
    const response = await fetch(endpoint, options);
    const contentType = response.headers.get('Content-Type') || '';
    
    // Log status code
    const statusColor = response.ok ? GREEN : RED;
    console.log(`${statusColor}[API] Response status: ${response.status}${RESET}`);
    
    // Parse response based on content type
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
      console.log(`Response data:`, data);
    } else {
      data = await response.text();
      console.log(`Response text:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));
    }
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`${RED}[API] Request failed:${RESET}`, error);
    return { ok: false, status: 0, error };
  }
}

// Main test function
async function testTaskToggle() {
  console.log(`${BLUE}=== Success Factor Task Toggle Test ===${RESET}`);
  
  try {
    // Step 1: Get projects
    console.log(`\nStep 1: Getting projects...`);
    const projectsResponse = await apiRequest('GET', '/api/projects');
    
    if (!projectsResponse.ok || !projectsResponse.data || !projectsResponse.data.length) {
      console.error(`${RED}Failed to get projects${RESET}`);
      return false;
    }
    
    const project = projectsResponse.data[0];
    console.log(`${GREEN}Using project:${RESET} ${project.name} (${project.id})`);
    
    // Step 2: Get tasks for this project
    console.log(`\nStep 2: Getting tasks for project...`);
    const tasksResponse = await apiRequest('GET', `/api/projects/${project.id}/tasks`);
    
    if (!tasksResponse.ok || !tasksResponse.data || !tasksResponse.data.length) {
      console.error(`${RED}Failed to get tasks for project${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}Found ${tasksResponse.data.length} tasks${RESET}`);
    
    // Step 3: Find a Success Factor task to toggle
    console.log(`\nStep 3: Finding a Success Factor task to toggle...`);
    const sfTasks = tasksResponse.data.filter(task => 
      (task.origin === 'factor' || task.origin === 'success-factor') && task.sourceId
    );
    
    if (!sfTasks.length) {
      console.log(`${YELLOW}No Success Factor tasks found in this project${RESET}`);
      return false;
    }
    
    const taskToToggle = sfTasks[0];
    console.log(`${GREEN}Selected task:${RESET} "${taskToToggle.text}" (ID: ${taskToToggle.id})`);
    console.log(`Current state: ${taskToToggle.completed ? 'Completed' : 'Not completed'}`);
    console.log(`Origin: ${taskToToggle.origin}, Source ID: ${taskToToggle.sourceId}`);
    
    // Step 4: Toggle the task
    console.log(`\nStep 4: Toggling task completion state...`);
    const newState = !taskToToggle.completed;
    const toggleResponse = await apiRequest('PUT', `/api/projects/${project.id}/tasks/${taskToToggle.id}`, {
      completed: newState
    });
    
    if (!toggleResponse.ok) {
      console.error(`${RED}Failed to toggle task state${RESET}`);
      if (toggleResponse.status === 500) {
        console.error(`${RED}500 Server Error - This is what we're trying to fix!${RESET}`);
      }
      return false;
    }
    
    console.log(`${GREEN}Successfully toggled task state to: ${newState ? 'Completed' : 'Not completed'}${RESET}`);
    
    // Step 5: Verify the change with a fresh GET request
    console.log(`\nStep 5: Verifying task state change persistence...`);
    console.log(`Waiting ${TOGGLE_DELAY}ms before verification...`);
    await new Promise(resolve => setTimeout(resolve, TOGGLE_DELAY));
    
    const verifyResponse = await apiRequest('GET', `/api/projects/${project.id}/tasks`);
    
    if (!verifyResponse.ok) {
      console.error(`${RED}Failed to verify task state${RESET}`);
      return false;
    }
    
    // Find the same task in the fresh response
    const updatedTask = verifyResponse.data.find(task => task.id === taskToToggle.id);
    
    if (!updatedTask) {
      console.error(`${RED}Could not find the task after toggle${RESET}`);
      return false;
    }
    
    // Verify the state was persisted correctly
    const stateMatches = updatedTask.completed === newState;
    
    if (stateMatches) {
      console.log(`${GREEN}Verified: Task state was correctly persisted${RESET}`);
      console.log(`${GREEN}New state: ${updatedTask.completed ? 'Completed' : 'Not completed'}${RESET}`);
    } else {
      console.error(`${RED}Task state was not correctly persisted${RESET}`);
      console.log(`Expected: ${newState ? 'Completed' : 'Not completed'}`);
      console.log(`Actual: ${updatedTask.completed ? 'Completed' : 'Not completed'}`);
    }
    
    // Verify metadata was preserved
    const sourceIdPreserved = updatedTask.sourceId === taskToToggle.sourceId;
    const originPreserved = updatedTask.origin === taskToToggle.origin;
    
    if (sourceIdPreserved && originPreserved) {
      console.log(`${GREEN}Verified: Task metadata was preserved${RESET}`);
    } else {
      console.error(`${RED}Task metadata was not preserved${RESET}`);
      console.log(`Original sourceId: ${taskToToggle.sourceId}, New sourceId: ${updatedTask.sourceId}`);
      console.log(`Original origin: ${taskToToggle.origin}, New origin: ${updatedTask.origin}`);
    }
    
    // Final status
    if (stateMatches && sourceIdPreserved && originPreserved) {
      console.log(`\n${GREEN}TEST PASSED: Task toggle persistence is working correctly${RESET}`);
      return true;
    } else {
      console.log(`\n${RED}TEST FAILED: Some verification checks did not pass${RESET}`);
      return false;
    }
    
  } catch (error) {
    console.error(`${RED}Test failed with error:${RESET}`, error);
    return false;
  }
}

// Run the test
console.log(`${BLUE}Starting Success Factor task toggle persistence test...${RESET}`);
console.log(`${YELLOW}Copy and paste this ENTIRE script into your browser console while logged in${RESET}`);
console.log(`${YELLOW}The test will run automatically and report results${RESET}`);

// Self-executing function to allow for async/await
(async () => {
  try {
    const result = await testTaskToggle();
    console.log(`\n${result ? GREEN : RED}Test ${result ? 'PASSED' : 'FAILED'}${RESET}`);
  } catch (e) {
    console.error(`${RED}Test execution error:${RESET}`, e);
  }
})();