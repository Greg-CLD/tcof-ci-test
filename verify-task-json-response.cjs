/**
 * Verification Test for Task Update JSON Response
 * 
 * This script verifies that the task update endpoint properly returns
 * JSON responses with the correct Content-Type headers.
 */
const http = require('http');
const fs = require('fs');

// Helper to read session cookie from file
function getSessionCookie() {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (err) {
    console.error('Could not read cookies.txt file:', err.message);
    return '';
  }
}

// Simple HTTP request function
function makeRequest(options, requestBody = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (requestBody) {
      req.write(JSON.stringify(requestBody));
    }
    
    req.end();
  });
}

// Main test function
async function verifyTaskJsonResponse() {
  console.log('📝 Verifying task update JSON response...');
  
  const cookie = getSessionCookie();
  if (!cookie) {
    console.error('❌ No session cookie found, authentication may fail');
  } else {
    console.log('✅ Found session cookie');
  }
  
  try {
    // Step 1: Get a test project
    const projectsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });
    
    if (projectsResponse.status !== 200) {
      console.error(`❌ Failed to get projects: ${projectsResponse.status}`);
      return;
    }
    
    let projects;
    try {
      projects = JSON.parse(projectsResponse.data);
    } catch (e) {
      console.error('❌ Failed to parse projects response as JSON:', e.message);
      return;
    }
    
    if (!projects || !projects.length) {
      console.error('❌ No projects found');
      return;
    }
    
    const testProject = projects[0];
    console.log(`✅ Using test project: ${testProject.id} (${testProject.name})`);
    
    // Step 2: Get tasks for this project
    const tasksResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/projects/${testProject.id}/tasks`,
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });
    
    if (tasksResponse.status !== 200) {
      console.error(`❌ Failed to get tasks: ${tasksResponse.status}`);
      return;
    }
    
    let tasks;
    try {
      tasks = JSON.parse(tasksResponse.data);
    } catch (e) {
      console.error('❌ Failed to parse tasks response as JSON:', e.message);
      return;
    }
    
    if (!tasks || !tasks.length) {
      console.error('❌ No tasks found for project');
      return;
    }
    
    // Find a Success Factor task if possible
    let testTask = tasks.find(t => t.origin === 'success-factor' || t.origin === 'factor');
    if (!testTask) {
      console.log('ℹ️ No Success Factor task found, using first task');
      testTask = tasks[0];
    }
    
    console.log(`✅ Using task: ${testTask.id}`);
    console.log(`   - Text: ${testTask.text || 'N/A'}`);
    console.log(`   - Origin: ${testTask.origin || 'N/A'}`);
    console.log(`   - Completed: ${testTask.completed}`);
    
    // Step 3: Update the task by toggling completion
    const update = {
      completed: !testTask.completed
    };
    
    console.log(`📝 Sending update: completed = ${update.completed}`);
    
    const updateResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/projects/${testProject.id}/tasks/${testTask.id}`,
      method: 'PUT',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, update);
    
    console.log(`📋 Response Status: ${updateResponse.status}`);
    console.log(`📋 Content-Type: ${updateResponse.headers['content-type']}`);
    
    if (updateResponse.headers['content-type']?.includes('application/json')) {
      console.log('✅ SUCCESS: Received JSON Content-Type header');
    } else {
      console.error(`❌ Wrong Content-Type header: ${updateResponse.headers['content-type']}`);
    }
    
    try {
      // Try to parse response as JSON
      const responseData = JSON.parse(updateResponse.data);
      console.log('✅ SUCCESS: Response successfully parsed as JSON');
      console.log('📋 Response data:', JSON.stringify(responseData, null, 2));
      
      if (responseData.success === true) {
        console.log('✅ SUCCESS: Task update was successful');
      } else {
        console.error('❌ Task update failed:', responseData.message);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError.message);
      
      // Check if response is HTML
      if (updateResponse.data.includes('<!DOCTYPE html>')) {
        console.error('❌ ERROR: Received HTML instead of JSON!');
        console.error('First 200 characters of response:', updateResponse.data.substring(0, 200));
      } else {
        console.error('Raw response:', updateResponse.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
verifyTaskJsonResponse();