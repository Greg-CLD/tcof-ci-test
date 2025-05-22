/**
 * Comprehensive Task Persistence Test Suite
 * 
 * This script tests end-to-end task persistence for all task types and ID formats:
 * 1. Tests persistence for a Success Factor task (with sourceId)
 * 2. Tests persistence for a custom task (with taskId)
 * 3. Tests persistence for a success factor task with compoundId
 * 
 * For each test case, the script:
 * - Gets the current task state
 * - Toggles the task state
 * - Verifies the response is successful
 * - Gets the tasks again to verify persistence
 * - Logs detailed diagnostics
 */

// ANSI color codes for better console output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

// Global settings
const API_BASE = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Get API cookie from the cookie.txt file or environment
function getCookie() {
  try {
    const fs = require('fs');
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (error) {
    console.warn(`${YELLOW}Warning: No cookie file found. Authentication may fail.${RESET}`);
    return '';
  }
}

// Utility function for API requests
async function apiRequest(method, endpoint, body = null) {
  try {
    const cookie = getCookie();
    const url = `${API_BASE}${endpoint}`;
    
    console.log(`${CYAN}[API REQUEST] ${method} ${endpoint}${RESET}`);
    if (body) {
      console.log(`${CYAN}Body: ${JSON.stringify(body, null, 2)}${RESET}`);
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    console.log(`${CYAN}Response Status: ${response.status}${RESET}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${RED}API Error: ${response.status} - ${errorText}${RESET}`);
      return { error: true, status: response.status, message: errorText };
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      return json;
    } else {
      const text = await response.text();
      return { text };
    }
  } catch (error) {
    console.error(`${RED}Request failed: ${error.message}${RESET}`);
    return { error: true, message: error.message };
  }
}

// Get all tasks for the current project
async function getAllTasks() {
  console.log(`${BLUE}Getting all tasks for project ${PROJECT_ID}...${RESET}`);
  const response = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
  return response;
}

// Find a specific success factor task by source ID
function findSuccessFactorTask(tasks) {
  return tasks.find(task => 
    (task.origin === 'factor' || task.origin === 'success-factor') && 
    task.sourceId && task.sourceId.length > 10);
}

// Find a custom task (non-success factor)
function findCustomTask(tasks) {
  return tasks.find(task => task.origin === 'custom');
}

// Toggle a task's completion state
async function toggleTaskCompletion(taskId, currentState) {
  console.log(`${BLUE}Toggling task ${taskId} from ${currentState ? 'completed' : 'incomplete'} to ${!currentState ? 'completed' : 'incomplete'}${RESET}`);
  
  const updateData = {
    completed: !currentState
  };
  
  const response = await apiRequest(
    'PUT', 
    `/api/projects/${PROJECT_ID}/tasks/${taskId}`,
    updateData
  );
  
  return response;
}

// Run test for a success factor task (by sourceId)
async function testSuccessFactorTask(tasks) {
  console.log(`\n${MAGENTA}================================${RESET}`);
  console.log(`${MAGENTA}TEST 1: SUCCESS FACTOR TASK (SOURCEID)${RESET}`);
  console.log(`${MAGENTA}================================${RESET}`);
  
  const sfTask = findSuccessFactorTask(tasks);
  
  if (!sfTask) {
    console.error(`${RED}No success factor task found!${RESET}`);
    return false;
  }
  
  console.log(`${BLUE}Found success factor task:${RESET}`);
  console.log(`${BLUE}- ID: ${sfTask.id}${RESET}`);
  console.log(`${BLUE}- Source ID: ${sfTask.sourceId}${RESET}`);
  console.log(`${BLUE}- Text: ${sfTask.text}${RESET}`);
  console.log(`${BLUE}- Current completion: ${sfTask.completed}${RESET}`);
  
  // Toggle the task
  const originalState = sfTask.completed;
  const updateResponse = await toggleTaskCompletion(sfTask.id, originalState);
  
  if (updateResponse.error) {
    console.error(`${RED}Failed to update success factor task!${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Success factor task update response:${RESET}`, updateResponse);
  
  // Verify persistence by fetching all tasks again
  const updatedTasks = await getAllTasks();
  const updatedTask = updatedTasks.find(t => t.id === sfTask.id);
  
  if (!updatedTask) {
    console.error(`${RED}Could not find task after update!${RESET}`);
    return false;
  }
  
  const persistenceSuccessful = updatedTask.completed === !originalState;
  
  console.log(`${persistenceSuccessful ? GREEN : RED}Persistence check: ${persistenceSuccessful ? 'PASSED' : 'FAILED'}${RESET}`);
  console.log(`${BLUE}Updated task:${RESET}`);
  console.log(`${BLUE}- ID: ${updatedTask.id}${RESET}`);
  console.log(`${BLUE}- Source ID: ${updatedTask.sourceId}${RESET}`);
  console.log(`${BLUE}- Text: ${updatedTask.text}${RESET}`);
  console.log(`${BLUE}- New completion state: ${updatedTask.completed}${RESET}`);
  console.log(`${BLUE}- Expected state: ${!originalState}${RESET}`);
  
  return persistenceSuccessful;
}

// Run test for a custom task
async function testCustomTask(tasks) {
  console.log(`\n${MAGENTA}================================${RESET}`);
  console.log(`${MAGENTA}TEST 2: CUSTOM TASK (TASK ID)${RESET}`);
  console.log(`${MAGENTA}================================${RESET}`);
  
  const customTask = findCustomTask(tasks);
  
  if (!customTask) {
    console.log(`${YELLOW}No custom task found. Creating one...${RESET}`);
    
    // Create a custom task
    const newTask = {
      text: "Test custom task for persistence verification",
      origin: "custom",
      completed: false
    };
    
    const createResponse = await apiRequest(
      'POST',
      `/api/projects/${PROJECT_ID}/tasks`,
      newTask
    );
    
    if (createResponse.error) {
      console.error(`${RED}Failed to create custom task!${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}Custom task created:${RESET}`, createResponse);
    
    // Get updated task list with our new task
    const refreshedTasks = await getAllTasks();
    const createdTask = findCustomTask(refreshedTasks);
    
    if (!createdTask) {
      console.error(`${RED}Could not find the created custom task!${RESET}`);
      return false;
    }
    
    // Now test the task we just created
    return testExistingCustomTask(createdTask);
  } else {
    return testExistingCustomTask(customTask);
  }
}

// Test an existing custom task
async function testExistingCustomTask(customTask) {
  console.log(`${BLUE}Found custom task:${RESET}`);
  console.log(`${BLUE}- ID: ${customTask.id}${RESET}`);
  console.log(`${BLUE}- Text: ${customTask.text}${RESET}`);
  console.log(`${BLUE}- Current completion: ${customTask.completed}${RESET}`);
  
  // Toggle the task
  const originalState = customTask.completed;
  const updateResponse = await toggleTaskCompletion(customTask.id, originalState);
  
  if (updateResponse.error) {
    console.error(`${RED}Failed to update custom task!${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Custom task update response:${RESET}`, updateResponse);
  
  // Verify persistence by fetching all tasks again
  const updatedTasks = await getAllTasks();
  const updatedTask = updatedTasks.find(t => t.id === customTask.id);
  
  if (!updatedTask) {
    console.error(`${RED}Could not find custom task after update!${RESET}`);
    return false;
  }
  
  const persistenceSuccessful = updatedTask.completed === !originalState;
  
  console.log(`${persistenceSuccessful ? GREEN : RED}Persistence check: ${persistenceSuccessful ? 'PASSED' : 'FAILED'}${RESET}`);
  console.log(`${BLUE}Updated task:${RESET}`);
  console.log(`${BLUE}- ID: ${updatedTask.id}${RESET}`);
  console.log(`${BLUE}- Text: ${updatedTask.text}${RESET}`);
  console.log(`${BLUE}- New completion state: ${updatedTask.completed}${RESET}`);
  console.log(`${BLUE}- Expected state: ${!originalState}${RESET}`);
  
  return persistenceSuccessful;
}

// Test task with compound ID format
async function testCompoundIdTask(tasks) {
  console.log(`\n${MAGENTA}================================${RESET}`);
  console.log(`${MAGENTA}TEST 3: SUCCESS FACTOR TASK (COMPOUND ID)${RESET}`);
  console.log(`${MAGENTA}================================${RESET}`);
  
  const sfTask = findSuccessFactorTask(tasks);
  
  if (!sfTask) {
    console.error(`${RED}No success factor task found for compound ID test!${RESET}`);
    return false;
  }
  
  // Create a compound ID
  const compoundId = `${sfTask.id}-${sfTask.sourceId}`;
  console.log(`${BLUE}Testing with compound ID format:${RESET}`);
  console.log(`${BLUE}- Original ID: ${sfTask.id}${RESET}`);
  console.log(`${BLUE}- Source ID: ${sfTask.sourceId}${RESET}`);
  console.log(`${BLUE}- Compound ID: ${compoundId}${RESET}`);
  console.log(`${BLUE}- Current completion: ${sfTask.completed}${RESET}`);
  
  // Toggle the task using the compound ID
  const originalState = sfTask.completed;
  const updateResponse = await toggleTaskCompletion(compoundId, originalState);
  
  if (updateResponse.error) {
    console.error(`${RED}Failed to update task with compound ID!${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Compound ID task update response:${RESET}`, updateResponse);
  
  // Verify persistence by fetching all tasks again
  const updatedTasks = await getAllTasks();
  const updatedTask = updatedTasks.find(t => t.id === sfTask.id);
  
  if (!updatedTask) {
    console.error(`${RED}Could not find task after compound ID update!${RESET}`);
    return false;
  }
  
  const persistenceSuccessful = updatedTask.completed === !originalState;
  
  console.log(`${persistenceSuccessful ? GREEN : RED}Persistence check: ${persistenceSuccessful ? 'PASSED' : 'FAILED'}${RESET}`);
  console.log(`${BLUE}Updated task:${RESET}`);
  console.log(`${BLUE}- ID: ${updatedTask.id}${RESET}`);
  console.log(`${BLUE}- Source ID: ${updatedTask.sourceId}${RESET}`);
  console.log(`${BLUE}- Text: ${updatedTask.text}${RESET}`);
  console.log(`${BLUE}- New completion state: ${updatedTask.completed}${RESET}`);
  console.log(`${BLUE}- Expected state: ${!originalState}${RESET}`);
  
  return persistenceSuccessful;
}

// Verify task state directly in the database
async function verifyDatabaseState() {
  console.log(`\n${MAGENTA}================================${RESET}`);
  console.log(`${MAGENTA}DATABASE VERIFICATION${RESET}`);
  console.log(`${MAGENTA}================================${RESET}`);
  
  try {
    const { exec } = require('child_process');
    
    const query = `
      SELECT 
        id, 
        project_id, 
        source_id, 
        text, 
        origin, 
        completed 
      FROM 
        project_tasks 
      WHERE 
        project_id = '${PROJECT_ID}'
    `;
    
    const dbCommand = `
      echo "${query}" | \
      PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -t -A -F"," -c "${query}"
    `;
    
    console.log(`${BLUE}Executing database query:${RESET}`);
    console.log(query);
    
    exec(dbCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`${RED}Database query failed: ${error.message}${RESET}`);
        return;
      }
      
      if (stderr) {
        console.error(`${RED}Database stderr: ${stderr}${RESET}`);
      }
      
      console.log(`${GREEN}Database query results:${RESET}`);
      
      // Parse CSV output
      const rows = stdout.trim().split('\n');
      
      if (rows.length === 0 || rows[0] === '') {
        console.log(`${YELLOW}No results found in database.${RESET}`);
        return;
      }
      
      // Format as a table
      const tasks = rows.map(row => {
        const [id, projectId, sourceId, text, origin, completed] = row.split(',');
        return { id, projectId, sourceId, text, origin, completed: completed === 't' };
      });
      
      console.table(tasks);
      
      // Summary of completion states
      const completedCount = tasks.filter(t => t.completed).length;
      const incompleteCount = tasks.length - completedCount;
      
      console.log(`${GREEN}Summary: ${tasks.length} tasks found. ${completedCount} completed, ${incompleteCount} incomplete.${RESET}`);
    });
  } catch (error) {
    console.error(`${RED}Error accessing database: ${error.message}${RESET}`);
  }
}

// Main test runner
async function runTests() {
  console.log(`${MAGENTA}======================================${RESET}`);
  console.log(`${MAGENTA}TASK PERSISTENCE COMPREHENSIVE TEST SUITE${RESET}`);
  console.log(`${MAGENTA}======================================${RESET}`);
  
  // Get all tasks for testing
  const tasks = await getAllTasks();
  
  if (!tasks || tasks.error) {
    console.error(`${RED}Failed to get tasks. Test suite cannot continue.${RESET}`);
    return;
  }
  
  console.log(`${GREEN}Retrieved ${tasks.length} tasks for testing.${RESET}`);
  
  // Run each test
  const test1Result = await testSuccessFactorTask(tasks);
  const test2Result = await testCustomTask(tasks);
  const test3Result = await testCompoundIdTask(tasks);
  
  // Verify database state
  await verifyDatabaseState();
  
  // Print summary
  console.log(`\n${MAGENTA}======================================${RESET}`);
  console.log(`${MAGENTA}TEST SUITE SUMMARY${RESET}`);
  console.log(`${MAGENTA}======================================${RESET}`);
  console.log(`${BLUE}Test 1 (Success Factor Task): ${test1Result ? GREEN + 'PASSED' : RED + 'FAILED'}${RESET}`);
  console.log(`${BLUE}Test 2 (Custom Task): ${test2Result ? GREEN + 'PASSED' : RED + 'FAILED'}${RESET}`);
  console.log(`${BLUE}Test 3 (Compound ID): ${test3Result ? GREEN + 'PASSED' : RED + 'FAILED'}${RESET}`);
  
  const overallResult = test1Result && test2Result && test3Result;
  console.log(`\n${overallResult ? GREEN : RED}Overall test result: ${overallResult ? 'PASSED' : 'FAILED'}${RESET}`);
  
  if (overallResult) {
    console.log(`${GREEN}✓ All task persistence tests passed!${RESET}`);
    console.log(`${GREEN}✓ Tasks state changes are correctly persisted in the database.${RESET}`);
  } else {
    console.log(`${RED}✗ One or more persistence tests failed.${RESET}`);
    console.log(`${RED}✗ Check the detailed test output above for more information.${RESET}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${RED}Unhandled error in test suite:${RESET}`, error);
});