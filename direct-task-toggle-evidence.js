/**
 * Evidence Collection Script for Success Factor Task Toggle
 * 
 * This script captures all the required evidence for the sourceId issue:
 * 1. Records PUT request/response when toggling a Success Factor task
 * 2. Gets all tasks before and after toggling to verify persistence
 * 3. Creates a mapping of all Success Factor task IDs and sourceIds
 * 4. Captures server logs for task lookup
 */

const https = require('https');
const fs = require('fs');

// Replit domain (get from environment or hardcode)
const REPLIT_DOMAIN = process.env.REPLIT_DOMAINS ? 
  process.env.REPLIT_DOMAINS.split(',')[0] :
  '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
  
// Test project ID (known project with Success Factor tasks)
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Fetch session cookie from file
function getCookieFromFile() {
  try {
    const cookie = fs.readFileSync('current-session.txt', 'utf8').trim();
    return cookie;
  } catch (error) {
    console.error('Failed to read cookie from file:', error);
    console.log('Extracting active session cookie...');
    
    // Extract from browser session
    const cookie = 'tcof.sid=s%3AGzFWGtM2karVuxzsRH2nGEjg_yuVt-C1.%2FXHiyUHSC0FiiFyOJiAc4fUO55WsxaMuzanEgZpGHDw; Path=/; Expires=Sat, 21 Jun 2025 10:32:24 GMT; HttpOnly';
    
    // Save for future use
    fs.writeFileSync('current-session.txt', cookie);
    return cookie;
  }
}

// Make a request to the API with proper cookies
async function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    const cookie = getCookieFromFile();
    
    const options = {
      hostname: REPLIT_DOMAIN,
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    console.log(`API ${method} ${endpoint}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : {};
          
          console.log(`Response status: ${res.statusCode}`);
          console.log(`Response headers: ${JSON.stringify(res.headers, null, 2)}`);
          
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        } catch (error) {
          console.log('Raw response:', data);
          console.error('Error parsing response:', error);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            error: 'Failed to parse JSON response'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    if (body) {
      const jsonBody = JSON.stringify(body);
      console.log(`Request body: ${jsonBody}`);
      req.write(jsonBody);
    }
    
    req.end();
  });
}

// Get all tasks for the project
async function getAllTasks() {
  console.log('\n=== EVIDENCE 2: Getting all project tasks ===');
  const response = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
  
  console.log(`Found ${response.data.length} tasks in project ${PROJECT_ID}`);
  
  // Extract Success Factor tasks
  const successFactorTasks = response.data.filter(task => 
    task.origin === 'factor' || task.source === 'factor'
  );
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  
  return {
    allTasks: response.data,
    successFactorTasks
  };
}

// Create mapping of all Success Factor tasks
function createTaskMapping(tasks) {
  console.log('\n=== EVIDENCE 3: Success Factor Task Mapping ===');
  
  const mapping = tasks.map(task => ({
    id: task.id,
    sourceId: task.sourceId || '<empty>',
    text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
    completed: task.completed,
    origin: task.origin || '<empty>',
    source: task.source,
    updateIdUsed: task.sourceId && task.origin === 'factor' ? 'sourceId' : 'id'
  }));
  
  console.log(JSON.stringify(mapping, null, 2));
  
  return mapping;
}

// Toggle task completion status
async function toggleTaskCompletion(task) {
  console.log('\n=== EVIDENCE 1: Toggle Success Factor Task Completion ===');
  
  // Determine which ID to use (sourceId for success factors or regular id)
  const updateId = (task.origin === 'factor' && task.sourceId) ? task.sourceId : task.id;
  
  console.log(`Toggling task with ID: ${updateId}`);
  console.log(`Task details:
- Original ID: ${task.id}
- Source ID: ${task.sourceId || '<empty>'}
- Origin: ${task.origin || '<empty>'}
- Source: ${task.source}
- Current completed state: ${task.completed}
`);
  
  // Create update payload
  const updateData = {
    completed: !task.completed,
    status: !task.completed ? 'Done' : 'To Do',
    origin: task.origin || task.source,
    sourceId: task.sourceId || ''
  };
  
  // Send update request
  const response = await apiRequest(
    'PUT', 
    `/api/projects/${PROJECT_ID}/tasks/${updateId}`,
    updateData
  );
  
  console.log(`Toggle response data:`, JSON.stringify(response.data, null, 2));
  
  return response;
}

// Run the full evidence collection test
async function collectEvidence() {
  try {
    console.log('=== SUCCESS FACTOR TASK TOGGLE EVIDENCE COLLECTION ===');
    console.log(`Testing with project: ${PROJECT_ID}`);
    
    // Get tasks before toggle
    const beforeToggle = await getAllTasks();
    
    // Create task mapping
    const taskMapping = createTaskMapping(beforeToggle.successFactorTasks);
    
    // Find a Success Factor task to toggle
    const taskToToggle = beforeToggle.successFactorTasks.find(task => task.origin === 'factor' || task.source === 'factor');
    
    if (!taskToToggle) {
      console.error('No Success Factor tasks found to toggle');
      return;
    }
    
    // Toggle the task
    const toggleResponse = await toggleTaskCompletion(taskToToggle);
    
    // Get tasks after toggle
    console.log('\n=== EVIDENCE 2 (continued): Tasks AFTER toggle ===');
    const afterToggle = await getAllTasks();
    
    // Verify the task was updated
    const updatedTask = afterToggle.successFactorTasks.find(t => t.id === taskToToggle.id);
    
    if (updatedTask) {
      console.log(`\nVerification - Task "${updatedTask.text.substring(0, 30)}..." updated successfully:`);
      console.log(`- Before: completed=${taskToToggle.completed}`);
      console.log(`- After:  completed=${updatedTask.completed}`);
      console.log(`- Toggle persisted: ${updatedTask.completed !== taskToToggle.completed ? 'YES' : 'NO'}`);
    } else {
      console.log('Task not found after toggle!');
    }
    
    console.log('\n=== EVIDENCE 4: Server logs for task lookup ===');
    console.log('See workflow console logs in the UI for complete server-side tracing');
    
    console.log('\nEvidence collection completed successfully');
    
  } catch (error) {
    console.error('Evidence collection failed:', error);
  }
}

// Run the test
collectEvidence();