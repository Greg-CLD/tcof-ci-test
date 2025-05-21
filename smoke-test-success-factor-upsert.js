/**
 * Smoke Test for Success Factor Task Upsert via PUT Request
 * 
 * This script tests the success-factor task upsert feature by:
 * 1. Finding an existing project
 * 2. Generating a random success factor task ID that doesn't exist
 * 3. Sending a PUT request to update it
 * 4. Verifying that the task is created rather than returning a 404 error
 */

const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Get the session cookie if it exists or prompt for authentication
let sessionCookie;
try {
  sessionCookie = fs.readFileSync('./cookies.txt', 'utf8').trim();
} catch (err) {
  console.error('No session cookie found. Please run extract-session-cookie.js first.');
  process.exit(1);
}

async function runSmokeTest() {
  console.log('\n🔍 SUCCESS FACTOR TASK UPSERT SMOKE TEST');
  console.log('===========================================');
  
  try {
    // Step 1: Get a valid project ID
    console.log('\n1️⃣ Finding a valid project...');
    const projectsResponse = await axios.get('http://localhost:5000/api/projects', {
      headers: {
        Cookie: sessionCookie
      }
    });
    
    if (!projectsResponse.data || !projectsResponse.data.length) {
      console.error('❌ No projects found. Please create a project first.');
      process.exit(1);
    }
    
    const projectId = projectsResponse.data[0].id;
    console.log(`✅ Found project with ID: ${projectId}`);
    
    // Step 2: Generate a random task ID that doesn't exist
    console.log('\n2️⃣ Generating random success factor task ID...');
    const taskId = uuidv4();
    console.log(`✅ Generated task ID: ${taskId}`);
    
    // Step 3: Send a PUT request to create/update the task
    console.log('\n3️⃣ Sending PUT request for non-existent success factor task...');
    const taskUpdateData = {
      origin: 'success-factor',
      text: 'Test Success Factor Task',
      completed: true,
      stage: 'identification',
      status: 'Done',
      projectId
    };
    
    console.log('Task update data:', JSON.stringify(taskUpdateData, null, 2));
    
    const updateResponse = await axios.put(
      `http://localhost:5000/api/projects/${projectId}/tasks/${taskId}`,
      taskUpdateData,
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie
        }
      }
    );
    
    console.log(`✅ PUT Response Status: ${updateResponse.status}`);
    console.log('Response data:', JSON.stringify(updateResponse.data, null, 2));
    
    // Step 4: Verify the task was created by fetching it
    console.log('\n4️⃣ Verifying task was created by fetching it directly...');
    const fetchResponse = await axios.get(
      `http://localhost:5000/api/projects/${projectId}/tasks/${taskId}`,
      {
        headers: {
          Cookie: sessionCookie
        }
      }
    );
    
    console.log(`✅ GET Response Status: ${fetchResponse.status}`);
    console.log('Fetched task data:', JSON.stringify(fetchResponse.data, null, 2));
    
    // Final verification
    if (fetchResponse.status === 200 && fetchResponse.data && fetchResponse.data.id) {
      console.log('\n✅ SUCCESS FACTOR TASK UPSERT TEST PASSED!');
      console.log('The system successfully created a new task when a PUT request was made for a non-existent success factor task');
    } else {
      console.log('\n❌ SUCCESS FACTOR TASK UPSERT TEST FAILED!');
      console.log('The system did not properly create the task or return it');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR DURING TEST:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nTest failed. The success factor task upsert feature is not working correctly.');
  }
}

runSmokeTest();