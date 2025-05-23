/**
 * Project-Task Mismatch Protection Verification
 * 
 * This test script verifies our new project/task consistency fix by:
 * 1. Finding two different projects in the database
 * 2. Getting a task ID that exists in one project
 * 3. Attempting to update that task from the other project
 * 4. Validating that the protection mechanism prevents cross-project updates
 * 
 * Run with: node check-project-mismatch-protection.js
 */

// Use node-fetch for API requests
const fetch = require('node-fetch');
const fs = require('fs');
const { Client } = require('pg');

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Configuration
const FIRST_PROJECT_ID = '7277a5fe-899b-4fe6-8e35-05dd6103d054';  // Project where we'll get a task from
const SECOND_PROJECT_ID = '9a4c7110-bb5b-4321-a4ba-6c59366c8e96'; // Project we'll use to attempt cross-project update

// Extract session cookie from browser
async function getCookieFromFile() {
  try {
    // Try to read cookie from file
    const sessionContent = fs.readFileSync('./current-session.txt', 'utf8');
    return sessionContent.trim();
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return null;
  }
}

// Helper function for API requests with authenticated session
async function apiRequest(method, endpoint, body = null) {
  try {
    // Get session cookie
    const cookie = await getCookieFromFile();
    if (!cookie) {
      throw new Error('No session cookie found. Please run extract-current-session.js first');
    }
    
    // Create request options
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    };
    
    // Add body for non-GET requests
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    // Make request
    console.log(`Making ${method} request to ${endpoint}`);
    const response = await fetch(`http://localhost:5000${endpoint}`, options);
    
    // Parse JSON or text response
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = { text: await response.text() };
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      data: responseData
    };
  } catch (error) {
    console.error(`API request error (${method} ${endpoint}):`, error);
    return {
      status: -1,
      statusText: error.message,
      error: true
    };
  }
}

// Main test function
async function runTest() {
  console.log('=== PROJECT-TASK MISMATCH PROTECTION TEST ===\n');
  try {
    // Connect to database
    await client.connect();
    console.log('Connected to database\n');
    
    // Step 1: Find a task from the first project
    console.log(`Finding tasks in project ${FIRST_PROJECT_ID}...`);
    const tasksQuery = await client.query(
      'SELECT id, text, completed, source_id, origin FROM project_tasks WHERE project_id = $1 LIMIT 5',
      [FIRST_PROJECT_ID]
    );
    
    if (tasksQuery.rows.length === 0) {
      console.log('No tasks found in the first project. Please create some tasks first.');
      await client.end();
      return;
    }
    
    // Select a task to use for our test
    const testTask = tasksQuery.rows[0];
    console.log(`\nSelected test task from Project 1:`);
    console.log(`- ID: ${testTask.id}`);
    console.log(`- Text: ${testTask.text}`);
    console.log(`- Origin: ${testTask.origin || 'standard'}`);
    console.log(`- Source ID: ${testTask.source_id || 'N/A'}`);
    console.log(`- Completed: ${testTask.completed}\n`);
    
    // Step 2: Verify the second project exists
    console.log(`Verifying second project ${SECOND_PROJECT_ID} exists...`);
    const projectQuery = await client.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [SECOND_PROJECT_ID]
    );
    
    if (projectQuery.rows.length === 0) {
      console.log(`Second project ${SECOND_PROJECT_ID} not found. Please use a valid project ID.`);
      await client.end();
      return;
    }
    
    const projectName = projectQuery.rows[0].name;
    console.log(`Second project found: ${projectName}\n`);
    
    // Step 3: First, try legitimate update within the correct project context
    console.log('TEST 1: Legitimate update within correct project context');
    console.log(`Updating task ${testTask.id} in its own project ${FIRST_PROJECT_ID}...`);
    
    const correctUpdate = await apiRequest(
      'PUT',
      `/api/projects/${FIRST_PROJECT_ID}/tasks/${testTask.id}`,
      { completed: !testTask.completed }
    );
    
    console.log(`Response status: ${correctUpdate.status} ${correctUpdate.statusText}`);
    console.log('Response data:', JSON.stringify(correctUpdate.data, null, 2));
    
    if (correctUpdate.status >= 200 && correctUpdate.status < 300) {
      console.log('✅ Legitimate update succeeded as expected\n');
    } else {
      console.log('❌ Legitimate update failed unexpectedly\n');
    }
    
    // Step 4: Try cross-project update (should be blocked)
    console.log('TEST 2: Blocked cross-project update attempt');
    console.log(`Attempting to update task ${testTask.id} from wrong project ${SECOND_PROJECT_ID}...`);
    
    const crossProjectUpdate = await apiRequest(
      'PUT',
      `/api/projects/${SECOND_PROJECT_ID}/tasks/${testTask.id}`,
      { completed: !testTask.completed }
    );
    
    console.log(`Response status: ${crossProjectUpdate.status} ${crossProjectUpdate.statusText}`);
    console.log('Response data:', JSON.stringify(crossProjectUpdate.data, null, 2));
    
    // Check if our protection worked - we expect a 404 (not found) or 403 (forbidden)
    const protectionWorked = crossProjectUpdate.status === 404 || crossProjectUpdate.status === 403;
    
    if (protectionWorked) {
      console.log('✅ Cross-project update correctly blocked with status code ' + crossProjectUpdate.status);
      
      // Check for our specific error code
      if (crossProjectUpdate.data && 
          (crossProjectUpdate.data.error === 'TASK_NOT_FOUND' || 
           crossProjectUpdate.data.error === 'PROJECT_TASK_MISMATCH')) {
        console.log(`✅ Correct error code returned: ${crossProjectUpdate.data.error}`);
      } else {
        console.log('⚠️ Expected error code not found in response');
      }
    } else {
      console.log('❌ Cross-project update was not properly blocked');
    }
    
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Legitimate update: ${correctUpdate.status >= 200 && correctUpdate.status < 300 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Cross-project protection: ${protectionWorked ? 'PASS ✅' : 'FAIL ❌'}`);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
runTest();