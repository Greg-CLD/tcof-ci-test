/**
 * Success Factor Task Upsert Test
 * 
 * This script verifies that our new upsert functionality for success-factor tasks works correctly.
 * It attempts to update a non-existent task with origin 'success-factor' and checks if it's created.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Helper function for API requests with cookie auth
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'connect.sid=s%3AnOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs.QGzCCaExBR4SQS4nh3cLbqbcJt51hGC50f9u72i3N6w'
    },
    url: `http://localhost:5000${endpoint}`
  };
  
  // Only add data for non-GET requests
  if (body && method !== 'GET') {
    options.data = body;
  }

  try {
    const response = await axios(options);
    return {
      status: response.status,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(JSON.stringify(response.data))
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        json: () => Promise.resolve(error.response.data),
        text: () => Promise.resolve(JSON.stringify(error.response.data))
      };
    }
    throw error;
  }
}

async function runTest() {
  console.log('🧪 Testing Success-Factor Task Upsert Functionality');
  
  try {
    // 1. Get a valid project ID to work with
    console.log('Step 1: Getting a valid project ID...');
    const projectsRes = await apiRequest('GET', '/api/projects');
    const projects = await projectsRes.json();
    
    if (!projects.length) {
      console.error('❌ No projects found to test with');
      return;
    }
    
    const projectId = projects[0].id;
    console.log(`✅ Found project ${projectId}`);
    
    // 2. Generate a random UUID for our non-existent task
    const nonExistentTaskId = uuidv4();
    console.log(`Step 2: Generated non-existent task ID: ${nonExistentTaskId}`);
    
    // 3. Try to update this non-existent task with success-factor origin
    console.log('Step 3: Updating non-existent task with success-factor origin...');
    const updateData = {
      projectId,
      origin: 'success-factor',
      text: 'Auto-created success factor test task',
      stage: 'identification',
      completed: false
    };
    
    const updateRes = await apiRequest(
      'PATCH', 
      `/api/projects/${projectId}/tasks/${nonExistentTaskId}`, 
      updateData
    );
    
    console.log(`Response status: ${updateRes.status}`);
    
    if (updateRes.status !== 200) {
      console.error('❌ Failed to upsert task:', await updateRes.text());
      return;
    }
    
    const updatedTask = await updateRes.json();
    console.log('✅ Task upsert successful! Response:', updatedTask);
    
    // 4. Verify we can now get the task directly
    console.log('Step 4: Verifying task was correctly created and stored...');
    const getTaskRes = await apiRequest('GET', `/api/projects/${projectId}/tasks/${nonExistentTaskId}`);
    
    if (getTaskRes.status !== 200) {
      console.error('❌ Failed to retrieve upserted task:', await getTaskRes.text());
      return;
    }
    
    const retrievedTask = await getTaskRes.json();
    console.log('✅ Successfully retrieved upserted task!');
    console.log(JSON.stringify(retrievedTask, null, 2));
    
    console.log('\n🎉 SUCCESS-FACTOR UPSERT TEST PASSED! The fix is working correctly.');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

runTest();