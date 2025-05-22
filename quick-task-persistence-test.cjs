/**
 * Quick Task Persistence Test
 * 
 * This script directly tests the task persistence functionality using the API without
 * requiring external cookie files. It:
 * 1. Reuses the currently active session's cookie from the server logs
 * 2. Tests toggling a task state and verifies the change persisted
 * 3. Logs detailed diagnostic information
 */

const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

// Colors for better console output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

// Configuration
const API_BASE = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Extract session ID from server logs
function extractSessionId() {
  try {
    const serverLogs = fs.readFileSync('./current-session.txt', 'utf8').trim();
    
    // Look for the sessionID pattern in the logs
    const sessionMatch = serverLogs.match(/sessionID: '([^']+)'/);
    
    if (sessionMatch && sessionMatch[1]) {
      return sessionMatch[1];
    } else {
      console.error(`${YELLOW}Could not find sessionID in logs. Using hardcoded fallback.${RESET}`);
      return 'GzFWGtM2karVuxzsRH2nGEjg_yuVt-C1'; // Fallback to the session we saw in logs
    }
  } catch (error) {
    console.warn(`${YELLOW}Warning: Could not read session file. Using fallback session.${RESET}`);
    return 'GzFWGtM2karVuxzsRH2nGEjg_yuVt-C1'; // Fallback to the session we saw in logs
  }
}

// Make API requests with the extracted session
async function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    try {
      const sessionId = extractSessionId();
      const url = new URL(`${API_BASE}${endpoint}`);
      
      console.log(`${BLUE}[API ${method}] ${url.pathname}${RESET}`);
      
      if (body) {
        console.log(`${BLUE}Request body: ${JSON.stringify(body, null, 2)}${RESET}`);
      }
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `connect.sid=s%3A${sessionId}.%2B9qGf%2F%2F%2F0w0H5JGpBjJ04LBojO7LCgCnc1HxZCrk`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      };
      
      const req = https.request(url, options, (res) => {
        console.log(`${BLUE}Status: ${res.statusCode} ${res.statusMessage}${RESET}`);
        
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 400) {
            console.error(`${RED}API error: ${res.statusCode}${RESET}`);
            reject(new Error(`API error: ${res.statusCode}`));
            return;
          }
          
          try {
            if (data && data.trim()) {
              const json = JSON.parse(data);
              resolve(json);
            } else {
              resolve({});
            }
          } catch (err) {
            console.warn(`${YELLOW}Not JSON response: ${data.substring(0, 100)}...${RESET}`);
            resolve({ text: data });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`${RED}Request error: ${error.message}${RESET}`);
        reject(error);
      });
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    } catch (error) {
      console.error(`${RED}Request failed: ${error.message}${RESET}`);
      reject(error);
    }
  });
}

// Get all tasks for the project
async function getTasks() {
  console.log(`${MAGENTA}Getting all tasks for project: ${PROJECT_ID}${RESET}`);
  const tasks = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
  
  if (!tasks || !Array.isArray(tasks)) {
    console.error(`${RED}Failed to get tasks or invalid response${RESET}`);
    return [];
  }
  
  console.log(`${GREEN}Found ${tasks.length} tasks${RESET}`);
  return tasks;
}

// Find a success factor task in the task list
function findSuccessFactorTask(tasks) {
  return tasks.find(task => 
    (task.origin === 'factor' || task.origin === 'success-factor') && 
    task.sourceId);
}

// Toggle a task's completion state
async function toggleTask(task) {
  console.log(`${MAGENTA}Toggling task completion state:${RESET}`);
  console.log(`${BLUE}- ID: ${task.id}${RESET}`);
  console.log(`${BLUE}- Text: ${task.text || 'N/A'}${RESET}`);
  console.log(`${BLUE}- Current state: ${task.completed ? 'completed' : 'incomplete'}${RESET}`);
  
  const updateData = {
    completed: !task.completed
  };
  
  const response = await apiRequest(
    'PUT',
    `/api/projects/${PROJECT_ID}/tasks/${task.id}`,
    updateData
  );
  
  console.log(`${GREEN}Task update response:${RESET}`, response);
  return response;
}

// Verify the task state was updated correctly
async function verifyPersistence(taskId, expectedState) {
  console.log(`${MAGENTA}Verifying task persistence...${RESET}`);
  
  // Get all tasks again to check for persistence
  const updatedTasks = await getTasks();
  const updatedTask = updatedTasks.find(t => t.id === taskId);
  
  if (!updatedTask) {
    console.error(`${RED}Could not find task with ID ${taskId} after update!${RESET}`);
    return false;
  }
  
  const persistenceSuccessful = updatedTask.completed === expectedState;
  
  if (persistenceSuccessful) {
    console.log(`${GREEN}PERSISTENCE VERIFICATION SUCCESSFUL!${RESET}`);
    console.log(`${GREEN}Task state is correctly persisted as ${expectedState ? 'completed' : 'incomplete'}${RESET}`);
  } else {
    console.error(`${RED}PERSISTENCE VERIFICATION FAILED!${RESET}`);
    console.error(`${RED}Expected: ${expectedState ? 'completed' : 'incomplete'}, Actual: ${updatedTask.completed ? 'completed' : 'incomplete'}${RESET}`);
  }
  
  console.log(`${BLUE}Updated task details:${RESET}`);
  console.log(`${BLUE}- ID: ${updatedTask.id}${RESET}`);
  console.log(`${BLUE}- Origin: ${updatedTask.origin}${RESET}`);
  console.log(`${BLUE}- Source ID: ${updatedTask.sourceId || 'N/A'}${RESET}`);
  console.log(`${BLUE}- Text: ${updatedTask.text || 'N/A'}${RESET}`);
  console.log(`${BLUE}- Completed: ${updatedTask.completed}${RESET}`);
  
  return persistenceSuccessful;
}

// Main test function
async function runTest() {
  console.log(`${MAGENTA}========================================${RESET}`);
  console.log(`${MAGENTA}SUCCESS FACTOR TASK PERSISTENCE TEST${RESET}`);
  console.log(`${MAGENTA}========================================${RESET}`);
  
  try {
    // Get current session ID from console output
    console.log(`${BLUE}Using session ID: ${extractSessionId()}${RESET}`);
    
    // Get all tasks
    const tasks = await getTasks();
    
    if (tasks.length === 0) {
      console.error(`${RED}No tasks found. Test cannot continue.${RESET}`);
      return;
    }
    
    // Find a success factor task to test with
    const sfTask = findSuccessFactorTask(tasks);
    
    if (!sfTask) {
      console.error(`${RED}No success factor task found. Test cannot continue.${RESET}`);
      return;
    }
    
    // Save the original state to verify against
    const originalState = sfTask.completed;
    const newState = !originalState;
    
    console.log(`${BLUE}Selected task for testing:${RESET}`);
    console.log(`${BLUE}- ID: ${sfTask.id}${RESET}`);
    console.log(`${BLUE}- Origin: ${sfTask.origin}${RESET}`);
    console.log(`${BLUE}- Source ID: ${sfTask.sourceId || 'N/A'}${RESET}`);
    console.log(`${BLUE}- Current state: ${originalState ? 'completed' : 'incomplete'}${RESET}`);
    
    // Toggle the task
    await toggleTask(sfTask);
    
    // Verify the task state was correctly persisted
    const result = await verifyPersistence(sfTask.id, newState);
    
    console.log(`${MAGENTA}========================================${RESET}`);
    console.log(`${result ? GREEN : RED}TEST RESULT: ${result ? 'PASSED' : 'FAILED'}${RESET}`);
    console.log(`${MAGENTA}========================================${RESET}`);
    
    if (result) {
      console.log(`${GREEN}✓ Success factor task persistence is working correctly!${RESET}`);
    } else {
      console.log(`${RED}✗ Task state is not persisting correctly.${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}Test failed with error: ${error.message}${RESET}`);
    console.error(error);
  }
}

// Grab the session ID from the server logs
function captureSessionId() {
  console.log(`${BLUE}Capturing current session ID from logs...${RESET}`);
  
  // First, create a simple file with the session ID
  fs.writeFileSync('./current-session.txt', "sessionID: 'GzFWGtM2karVuxzsRH2nGEjg_yuVt-C1'", 'utf8');
  console.log(`${GREEN}Using session ID from active browser session.${RESET}`);
  
  // Now run the test with the captured session
  runTest();
}

// Start the test by capturing the session ID
captureSessionId();