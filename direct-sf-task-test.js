/**
 * Success Factor Task Toggle Direct Test
 * 
 * This script directly tests how the application handles toggling a Success Factor task
 * and captures the evidence requested by the user.
 */

// Import required modules
const https = require('https');
const fs = require('fs');

// Project and domain configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const REPLIT_DOMAIN = '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

// Use a predefined Success Factor task with a known sourceId
// This matches a real success factor task in the database
const TEST_SF_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

// Session cookie for authentication
const SESSION_COOKIE = 'tcof.sid=s%3AGzFWGtM2karVuxzsRH2nGEjg_yuVt-C1.%2FXHiyUHSC0FiiFyOJiAc4fUO55WsxaMuzanEgZpGHDw';

// API request helper with proper logging
async function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: REPLIT_DOMAIN,
      port: 443, // HTTPS
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    console.log(`\n🌐 Making API ${method} request to ${endpoint}`);
    if (body) {
      console.log(`📦 Request payload: ${JSON.stringify(body, null, 2)}`);
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`📡 Response status: ${res.statusCode}`);
      console.log(`🔖 Response headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : {};
          console.log(`📄 Response body: ${JSON.stringify(responseData, null, 2)}`);
          resolve({ status: res.statusCode, headers: res.headers, data: responseData });
        } catch (error) {
          console.log(`🔴 Raw response (not JSON): ${data}`);
          console.error(`❌ Error parsing response: ${error}`);
          resolve({ status: res.statusCode, headers: res.headers, data: null, rawData: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`🚨 Request error: ${error.message}`);
      reject(error);
    });
    
    if (body) {
      const jsonBody = JSON.stringify(body);
      req.write(jsonBody);
    }
    
    req.end();
  });
}

// Get all tasks for the project
async function getAllTasks() {
  console.log('\n===== EVIDENCE 2: Getting all project tasks (BEFORE toggle) =====');
  const endpoint = `/api/projects/${PROJECT_ID}/tasks`;
  const response = await apiRequest('GET', endpoint);
  
  // Filter for Success Factor tasks 
  const sfTasks = response.data.filter(task => 
    task.origin === 'factor' || task.source === 'factor'
  );
  
  console.log(`\n📊 Task Statistics:
- Total tasks: ${response.data.length}
- Success Factor tasks: ${sfTasks.length}`);
  
  return { allTasks: response.data, sfTasks };
}

// Map all Success Factor tasks
function mapSuccessFactorTasks(tasks) {
  console.log('\n===== EVIDENCE 3: Success Factor Tasks Mapping =====');
  
  const mapping = tasks.map(task => ({
    id: task.id,
    sourceId: task.sourceId || '<empty>',
    text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
    completed: task.completed,
    origin: task.origin || '<empty>',
    source: task.source,
    updateIdUsed: (task.origin === 'factor' && task.sourceId) ? 'sourceId' : 'id'
  }));
  
  console.log(JSON.stringify(mapping, null, 2));
  return mapping;
}

// Toggle a specific Success Factor task
async function toggleSuccessFactorTask(taskId, currentState) {
  console.log('\n===== EVIDENCE 1: Toggle Success Factor Task =====');
  
  // Create update payload that mimics what the TaskCard component sends
  const updateData = {
    completed: !currentState,
    status: !currentState ? 'Done' : 'To Do', 
    origin: 'factor',
    sourceId: taskId // This is the key part - sending the sourceId in the payload
  };
  
  // Send the update request using the task ID in the URL
  const endpoint = `/api/projects/${PROJECT_ID}/tasks/${taskId}`;
  const response = await apiRequest('PUT', endpoint, updateData);
  
  return response;
}

// Get tasks after toggle to verify persistence
async function getTasksAfterToggle() {
  console.log('\n===== EVIDENCE 2 (continued): Tasks AFTER toggle =====');
  const endpoint = `/api/projects/${PROJECT_ID}/tasks`;
  const response = await apiRequest('GET', endpoint);
  return response.data;
}

// Run the complete test
async function runCompleteTest() {
  try {
    console.log('🔍 STARTING SUCCESS FACTOR TASK TOGGLE TEST 🔍');
    console.log(`📌 Testing with Success Factor task ID: ${TEST_SF_TASK_ID}`);
    
    // 1. Get all tasks before the toggle
    const { allTasks, sfTasks } = await getAllTasks();
    
    // 2. Map all Success Factor tasks for reference
    const taskMapping = mapSuccessFactorTasks(sfTasks);
    
    // 3. Find the specific test task
    const taskToToggle = sfTasks.find(t => t.id === TEST_SF_TASK_ID);
    
    if (!taskToToggle) {
      console.error(`❌ Error: Test task with ID ${TEST_SF_TASK_ID} not found!`);
      return;
    }
    
    console.log(`\n🎯 Selected test task:
- ID: ${taskToToggle.id}
- SourceID: ${taskToToggle.sourceId || '<empty>'}
- Text: ${taskToToggle.text.substring(0, 50)}...
- Current completed state: ${taskToToggle.completed}
- Origin: ${taskToToggle.origin || '<empty>'}`);
    
    // 4. Toggle the task
    const toggleResponse = await toggleSuccessFactorTask(
      taskToToggle.id, 
      taskToToggle.completed
    );
    
    // 5. Get tasks after toggle
    const updatedTasks = await getTasksAfterToggle();
    const updatedTask = updatedTasks.find(t => t.id === taskToToggle.id);
    
    // 6. Verify if the toggle was successful
    if (updatedTask) {
      console.log(`\n✅ VERIFICATION RESULTS:
- Before toggle: completed=${taskToToggle.completed}
- After toggle: completed=${updatedTask.completed}
- Toggle persisted: ${updatedTask.completed !== taskToToggle.completed ? 'YES ✓' : 'NO ✗'}
- SourceID retained: ${(updatedTask.sourceId === taskToToggle.sourceId) ? 'YES ✓' : 'NO ✗'}`);
    } else {
      console.log(`❌ Error: Task not found after toggle!`);
    }
    
    console.log('\n===== EVIDENCE 4: Server-side logs =====');
    console.log('Please see the workflow console logs in the UI for complete server-side task lookup tracing.');
    
    console.log('\n🏁 TEST COMPLETED');
    
  } catch (error) {
    console.error(`❌ Error running test: ${error.message}`);
  }
}

// Start the test
runCompleteTest();